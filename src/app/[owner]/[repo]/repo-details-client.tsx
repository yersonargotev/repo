"use client";

import AnalysisInProgress from "@/components/analysis-in-progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, BookOpen, ExternalLink, GitFork, Github, Lightbulb, RefreshCw, Star, Users } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

// --- Tipos (actualizados para coincidir con el nuevo API) ---
interface RepoData {
  id: number;
  owner: string;
  name: string;
  fullName: string;
  description: string | null;
  githubUrl: string;
  avatarUrl: string | null;
  primaryLanguage: string | null;
  stars: number | null;
  forks: number | null;
  openIssues?: number | null;
  size?: number | null;
  topics?: string[] | null;
  license?: string | null;
  isArchived?: boolean | null;
  isDisabled?: boolean | null;
  defaultBranch?: string | null;
  githubCreatedAt?: Date | null;
  githubUpdatedAt?: Date | null;
  githubPushedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface Alternative {
  name: string;
  url: string;
  description?: string;
  githubUrl?: string;
  stars?: number;
  category?: string;
  reasoning: string;
}

interface AnalysisData {
  id: number;
  alternatives: Alternative[] | null;
  category: string | null;
  summary?: string | null;
  strengths?: string[] | null;
  considerations?: string[] | null;
  useCase?: string | null;
  targetAudience?: string | null;
  analysisContent: string | null; // Legacy field
  createdAt: Date;
  updatedAt?: Date;
}

interface ApiResponse {
  repository: RepoData | null;
  analysis: AnalysisData | null;
  success: boolean;
  error?: string;
}

// --- Función de Fetch para el cliente ---
async function fetchRepoAndAnalysisFromServer(owner: string, repoName: string, forceRefresh: boolean = false): Promise<ApiResponse> {
  const response = await fetch('/api/analyze-repo', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ owner, repo: repoName, forceRefresh }),
  });
    if (!response.ok) {
    if (response.status === 202) {
      // Analysis in progress
      await response.json(); // Consume the response but don't store it
      return {
        repository: null,
        analysis: null,
        success: false,
        error: 'ANALYSIS_IN_PROGRESS'
      };
    }
    
    const errorData = await response.json();
    throw new Error(errorData.error || "Error al obtener datos del repositorio");
  }
  
  return response.json();
}

// --- Componente Cliente ---
export default function RepoDetailsClient({ owner, repoName }: { owner: string; repoName: string }) {
  const queryClientHook = useQueryClient();

  const { data, isLoading, error, isFetching, refetch } = useQuery<ApiResponse, Error>({
    queryKey: ['repo', owner, repoName],
    queryFn: () => fetchRepoAndAnalysisFromServer(owner, repoName),
    staleTime: 1000 * 60 * 5, // 5 minutos de stale time
    refetchOnWindowFocus: false,
    retry: false, // Don't auto-retry to avoid loops
  });
    // Mutación para forzar re-análisis
  const { mutate: reanalyzeRepo, isPending: isReanalyzing } = useMutation({
    mutationFn: async () => {
      // Force fresh analysis by calling the API with forceRefresh flag
      const result = await fetchRepoAndAnalysisFromServer(owner, repoName, true);
      return result;
    },
    onSuccess: (result) => {
      // Update the query cache with new data
      queryClientHook.setQueryData(['repo', owner, repoName], result);
      toast.success("¡Re-análisis completado exitosamente!");
    },
    onError: (error) => {
      toast.error(`Error durante el re-análisis: ${error.message || "Ocurrió un error inesperado"}`);
    },
  });


  // Check if analysis is in progress
  if (data?.error === 'ANALYSIS_IN_PROGRESS' || (error && error.message.includes('Failed to analyze repository: Internal Server Error'))) {
    return (
      <AnalysisInProgress 
        owner={owner} 
        repoName={repoName} 
        onAnalysisComplete={() => {
          // Refetch data when analysis is complete
          refetch();
        }}
      />
    );
  }

  if (isLoading) {
    return (      <div className="container mx-auto p-4 md:p-8 flex justify-center items-center min-h-[calc(100vh-200px)]">
        <div className="flex flex-col items-center space-y-2">
          <svg className="animate-spin h-12 w-12 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-lg text-muted-foreground">Loading repository data and AI analysis...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (      <div className="container mx-auto p-4 md:p-8">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <AlertTriangle className="mr-2 h-6 w-6" />
              Error loading repository
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error.message || "Could not fetch repository data. Please try again later."}</p>
            <Button onClick={() => refetch()} className="mt-4">Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  if (!data?.repository) {
     return (
      <div className="container mx-auto p-4 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="mr-2 h-6 w-6 text-orange-500" />
              Repository not found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>The repository <span className="font-semibold">{owner}/{repoName}</span> was not found or could not be accessed.</p>
            <p className="mt-2">Make sure the URL is correct and the repository is public.</p>
            <Link href="/">
              <Button variant="outline" className="mt-4">Back to home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const repoData = data.repository;
  const analysisData = data.analysis;
  const { name, description, githubUrl, avatarUrl, primaryLanguage, stars, forks } = repoData;


  return (
    <div className="container mx-auto max-w-4xl p-4 md:p-8">
      {/* Header del Repositorio */}
      <header className="mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
          <Avatar className="h-20 w-20 border">
            <AvatarImage src={avatarUrl || `https://via.placeholder.com/80?text=${repoData.owner[0]}`} alt={`Avatar de ${repoData.owner}`} />
            <AvatarFallback>{repoData.owner.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{name}</h1>
            <p className="text-xl text-muted-foreground">
              por <Link href={`https://github.com/${repoData.owner}`} target="_blank" rel="noopener noreferrer" className="hover:underline text-primary">{repoData.owner}</Link>
            </p>
          </div>
        </div>
        {description && <p className="text-lg text-muted-foreground mb-4">{description}</p>}
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <Button variant="outline" asChild>
            <Link href={githubUrl} target="_blank" rel="noopener noreferrer">
              <Github className="mr-2 h-4 w-4" /> Ver en GitHub
            </Link>
          </Button>
          {primaryLanguage && <Badge variant="secondary" className="text-base px-3 py-1">{primaryLanguage}</Badge>}
          <div className="flex items-center gap-1 text-muted-foreground">
            <Star className="h-5 w-5 text-yellow-500" />
            <span>{stars?.toLocaleString() || 0} stars</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <GitFork className="h-5 w-5 text-blue-500" />
            <span>{forks?.toLocaleString() || 0} forks</span>
          </div>
        </div>
      </header>      <Separator className="my-8" />

      {/* AI Analysis Section */}
      <section className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <Lightbulb className="mr-3 h-6 w-6 text-yellow-400" />
              AI Analysis
              {analysisData?.category && (
                <Badge variant="outline" className="ml-4 text-sm px-3 py-1">
                  <BookOpen className="mr-1 h-4 w-4 text-green-500" />
                  {analysisData.category}
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="flex items-center justify-between">
              <span>A detailed summary and insights about this repository.</span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => reanalyzeRepo()} 
                disabled={isReanalyzing || isFetching}
                className="ml-2"
              >
                <RefreshCw className={`mr-1 h-3 w-3 ${isReanalyzing || isFetching ? 'animate-spin' : ''}`} />
                {isReanalyzing ? 'Re-analyzing...' : (isFetching ? 'Updating...' : 'Re-analyze')}
              </Button>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isFetching && !isLoading && <p className="text-sm text-muted-foreground mb-4">Updating analysis...</p>}
            
            {/* Enhanced Analysis Display */}
            {analysisData ? (
              <div className="space-y-6">
                {/* Summary */}
                {analysisData.summary && (
                  <div>
                    <h4 className="font-semibold mb-3 text-lg">Summary</h4>
                    <p className="text-muted-foreground leading-relaxed">{analysisData.summary}</p>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Use Case */}
                  {analysisData.useCase && (
                    <div>
                      <h4 className="font-semibold mb-3">Primary Use Case</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">{analysisData.useCase}</p>
                    </div>
                  )}
                  
                  {/* Target Audience */}
                  {analysisData.targetAudience && (
                    <div>
                      <h4 className="font-semibold mb-3">Target Audience</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">{analysisData.targetAudience}</p>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Strengths */}
                  {analysisData.strengths && analysisData.strengths.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-3 text-green-700 dark:text-green-400">Key Strengths</h4>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2">
                        {analysisData.strengths.map((strength, index) => (
                          <li key={index} className="leading-relaxed">{strength}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Considerations */}
                  {analysisData.considerations && analysisData.considerations.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-3 text-orange-700 dark:text-orange-400">Considerations</h4>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2">
                        {analysisData.considerations.map((consideration, index) => (
                          <li key={index} className="leading-relaxed">{consideration}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                
                {/* Fallback to legacy analysis content */}
                {!analysisData.summary && analysisData.analysisContent && (
                  <article className="prose prose-sm sm:prose lg:prose-lg dark:prose-invert max-w-none" 
                           dangerouslySetInnerHTML={{ __html: analysisData.analysisContent.replace(/\n/g, '<br />') }} />
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">
                {isFetching ? 'Loading analysis...' : 'AI analysis for this repository is not yet available or is in progress.'}
              </p>
            )}
          </CardContent>
        </Card>
      </section>      {/* Alternatives Section */}
      <section className="mb-8">
        <div className="mb-6">
          <div className="flex items-center mb-2">
            <Users className="mr-3 h-7 w-7 text-muted-foreground" />
            <h2 className="text-2xl font-bold tracking-tight">Suggested Alternatives</h2>
          </div>
          <p className="text-muted-foreground">
            Discover similar projects and alternatives that might fit your needs.
          </p>
        </div>

        {analysisData?.alternatives && analysisData.alternatives.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
            {analysisData.alternatives.map((alt: Alternative, index: number) => (
              <Card key={index} className="group hover:shadow-lg transition-all duration-300 hover:border-border bg-card overflow-hidden">
                <CardContent className="p-0">
                  {/* Header */}
                  <div className="bg-muted/30 p-4 border-b border-border">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <Link href={alt.url} target="_blank" rel="noopener noreferrer" 
                              className="font-semibold text-lg text-foreground hover:text-primary flex items-center group/link transition-colors line-clamp-1">
                          <span className="truncate">{alt.name}</span>
                          <ExternalLink className="ml-2 h-4 w-4 opacity-0 group-hover/link:opacity-100 transition-opacity flex-shrink-0" />
                        </Link>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      {alt.category && (
                        <Badge variant="secondary" className="text-xs font-medium">
                          {alt.category}
                        </Badge>
                      )}
                      {alt.stars && (
                        <div className="flex items-center text-sm font-medium text-muted-foreground">
                          <Star className="h-4 w-4 mr-1 fill-yellow-400 text-yellow-400" />
                          <span>{alt.stars.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4 space-y-4">
                    {alt.description && (
                      <div>
                        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                          {alt.description}
                        </p>
                      </div>
                    )}
                    
                    {alt.reasoning && (
                      <div className="bg-muted/50 rounded-lg p-3 border border-border">
                        <div className="flex items-start gap-2">
                          <Lightbulb className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-foreground mb-1">
                              Why this alternative:
                            </p>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {alt.reasoning}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  {alt.githubUrl && alt.githubUrl !== alt.url && (
                    <div className="px-4 pb-4">
                      <Link href={alt.githubUrl} target="_blank" rel="noopener noreferrer" 
                            className="inline-flex items-center text-xs text-muted-foreground hover:text-primary hover:underline transition-colors">
                        <Github className="h-3 w-3 mr-1" />
                        View on GitHub
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed border-2 border-muted-foreground/25">
            <CardContent className="text-center py-12">
              <Users className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Alternatives Found</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                {isFetching ? 'Searching for alternatives...' : 'No alternatives have been analyzed yet. Try re-analyzing the repository to discover similar projects.'}
              </p>
            </CardContent>
          </Card>
        )}
      </section>{/* Footer */}
      <footer className="mt-12 pt-8 border-t border-border">
        <div className="flex flex-col sm:flex-row justify-between items-center text-sm text-muted-foreground">
          <div className="mb-2 sm:mb-0">
            <p>Análisis generado el: <span className="font-medium">{analysisData?.createdAt ? new Date(analysisData.createdAt).toLocaleDateString() : 'N/A'}</span></p>
          </div>
          <div>
            <p>Datos del repositorio actualizados el: <span className="font-medium">{new Date(repoData.updatedAt).toLocaleDateString()}</span></p>
          </div>
        </div>
      </footer>
    </div>
  );
}