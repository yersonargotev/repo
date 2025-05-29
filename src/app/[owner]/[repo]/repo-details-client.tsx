"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, BookOpen, ExternalLink, GitFork, Github, Lightbulb, RefreshCw, Star, Users } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

// --- Tipos (duplicados para el cliente, idealmente compartir desde un archivo .d.ts o similar) ---
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
  createdAt: Date; // Asegúrate de que las fechas se manejen correctamente (pueden ser strings después de la serialización)
  updatedAt: Date;
}

interface AnalysisData {
  id: number;
  alternatives: Array<{ name: string; url: string; description?: string }> | null;
  category: string | null;
  analysisContent: string | null;
  createdAt: Date;
}

interface RepoAndAnalysis {
  repoData: RepoData | null;
  analysisData: AnalysisData | null;
}

// --- Función de Fetch para el cliente (debería ser una Server Action o API Route) ---
// Esta función es un placeholder. En una app real, llamarías a una Server Action
// que a su vez llama a getRepoAndAnalysis (o una versión modificada de ella).
async function fetchRepoAndAnalysisFromServer(owner: string, repoName: string): Promise<RepoAndAnalysis> {
  // Simulación de llamada a una API route o Server Action
  const response = await fetch(`/api/analyze-repo?owner=${owner}&repo=${repoName}`);
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Error al obtener datos del repositorio");
  }
  return response.json();
}

// --- Componente Cliente ---
export default function RepoDetailsClient({ owner, repoName }: { owner: string; repoName: string }) {
  const queryClientHook = useQueryClient();

  const { data, isLoading, error, isFetching, refetch } = useQuery<RepoAndAnalysis, Error>({
    queryKey: ['repo', owner, repoName],
    queryFn: () => fetchRepoAndAnalysisFromServer(owner, repoName), // Esta función debe ser implementada
    staleTime: 1000 * 60 * 5, // 5 minutos de stale time
    refetchOnWindowFocus: false,
  });
  
  // Mutación para forzar re-análisis (placeholder)
  const { mutate: reanalyzeRepo, isPending: isReanalyzing } = useMutation({
    mutationFn: async () => {
      // Aquí llamarías a una Server Action para re-analizar
      // Por ahora, solo invalidamos y refetch
      console.log("Simulando re-análisis...");
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simular delay
      // throw new Error("Simulación de error en re-análisis"); // Para probar errores
      return { message: "Re-análisis completado (simulado)" };
    },
    onSuccess: (data) => {
      toast.success(`Exito: ${data.message}`);
      queryClientHook.invalidateQueries({ queryKey: ['repo', owner, repoName] });
    },
    onError: (error) => {
      toast.error(`Error al re-analizar: ${error.message || "Ocurrió un error inesperado"}`);
    },
  });


  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-8 flex justify-center items-center min-h-[calc(100vh-200px)]">
        <div className="flex flex-col items-center space-y-2">
          <svg className="animate-spin h-12 w-12 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-lg text-muted-foreground">Cargando datos del repositorio...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 md:p-8">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <AlertTriangle className="mr-2 h-6 w-6" />
              Error al cargar el repositorio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error.message || "No se pudieron obtener los datos del repositorio. Por favor, inténtalo de nuevo más tarde."}</p>
            <Button onClick={() => refetch()} className="mt-4">Reintentar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data?.repoData) {
     return (
      <div className="container mx-auto p-4 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="mr-2 h-6 w-6 text-orange-500" />
              Repositorio no encontrado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>El repositorio <span className="font-semibold">{owner}/{repoName}</span> no fue encontrado o no se pudo acceder a él.</p>
            <p className="mt-2">Asegúrate de que la URL sea correcta y el repositorio sea público.</p>
            <Link href="/">
              <Button variant="outline" className="mt-4">Volver al inicio</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { repoData, analysisData } = data;
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
      </header>

      <Separator className="my-8" />

      {/* Contenido Principal: Análisis y Alternativas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-xl">
                <Lightbulb className="mr-2 h-5 w-5 text-yellow-400" />
                Análisis por IA
              </CardTitle>
              <CardDescription>
                Un resumen detallado y perspectivas sobre este repositorio.
                 <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => reanalyzeRepo()} 
                    disabled={isReanalyzing || isFetching}
                    className="ml-2"
                  >
                    <RefreshCw className={`mr-1 h-3 w-3 ${isReanalyzing || isFetching ? 'animate-spin' : ''}`} />
                    {isReanalyzing ? 'Re-analizando...' : (isFetching ? 'Actualizando...' : 'Re-analizar')}
                  </Button>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isFetching && !isLoading && <p className="text-sm text-muted-foreground mb-2">Actualizando análisis...</p>}
              {analysisData?.analysisContent ? (
                <article className="prose prose-sm sm:prose lg:prose-lg dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: analysisData.analysisContent.replace(/\n/g, '<br />') }} />

              ) : (
                <p className="text-muted-foreground">
                  {isFetching ? 'Cargando análisis...' : 'El análisis de IA para este repositorio aún no está disponible o está en proceso.'}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-6">
          {analysisData?.category && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <BookOpen className="mr-2 h-5 w-5 text-green-500" />
                  Categoría
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant="outline" className="text-md px-3 py-1">{analysisData.category}</Badge>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Users className="mr-2 h-5 w-5 text-purple-500" />
                Alternativas Sugeridas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analysisData?.alternatives && analysisData.alternatives.length > 0 ? (
                <ul className="space-y-3">
                  {analysisData.alternatives.map((alt, index) => (
                    <li key={index} className="text-sm">
                      <Link href={alt.url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline flex items-center">
                        {alt.name} <ExternalLink className="ml-1 h-3 w-3" />
                      </Link>
                      {alt.description && <p className="text-xs text-muted-foreground mt-0.5">{alt.description}</p>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {isFetching ? 'Buscando alternativas...' : 'No se encontraron alternativas o aún no han sido analizadas.'}
                </p>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
       <footer className="mt-12 text-center text-sm text-muted-foreground">
        <p>Análisis generado el: {analysisData?.createdAt ? new Date(analysisData.createdAt).toLocaleDateString() : 'N/A'}</p>
        <p>Datos del repositorio actualizados el: {new Date(repoData.updatedAt).toLocaleDateString()}</p>
      </footer>
    </div>
  );
}