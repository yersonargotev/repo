import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from '@tanstack/react-query';
import RepoDetailsClient from "./repo-details-client";

// --- Tipos para los datos ---
interface RepoPageParams {
  owner: string;
  repo: string;
}

// --- Función para obtener datos del repositorio y análisis ---
async function getRepoAndAnalysis(owner: string, repoName: string) {
  const baseUrl = process.env.NODE_ENV === 'development' 
    ? 'http://localhost:3000' 
    : process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000';
  
  try {
    const response = await fetch(`${baseUrl}/api/analyze-repo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ owner, repo: repoName }),
      cache: 'no-store', // Disable caching for fresh data
    });    if (!response.ok) {
      // If it's a 202 or 500 error, it might be a race condition or analysis in progress
      if (response.status === 202 || response.status === 500) {
        console.log(`Analysis may be in progress for ${owner}/${repoName}`);
        return { 
          success: false, 
          error: 'ANALYSIS_IN_PROGRESS',
          repository: null,
          analysis: null
        };
      }
      throw new Error(`Failed to analyze repository: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to analyze repository');
    }

    return data;    } catch (fetchError) {
      console.error('Error fetching repository analysis:', fetchError);
      if (fetchError instanceof Error && fetchError.message.includes('Failed to analyze repository: Internal Server Error')) {
      return { 
        success: false, 
        error: 'ANALYSIS_IN_PROGRESS',
        repository: null,
        analysis: null
      };
    }
    return null;
  }
}

// --- Metadata Dinámica ---
export async function generateMetadata({ params }: { params: Promise<RepoPageParams> }) {
  const { owner, repo } = await params;
  const data = await getRepoAndAnalysis(owner, repo);

  // If analysis is in progress or failed, show generic metadata
  if (!data || !data.repository || data.error === 'ANALYSIS_IN_PROGRESS') {
    return {
      title: `${repo} por ${owner} - GitHub Analyzer`,
      description: `Analyzing GitHub repository ${owner}/${repo}. Please wait while we generate insights and alternatives.`,
    };
  }

  const { repository } = data;

  return {
    title: `${repository.name} por ${repository.owner} - GitHub Analyzer`,
    description: repository.description || `Análisis y alternativas para el repositorio de GitHub ${repository.fullName}.`,
    openGraph: {
      title: `${repository.name} por ${repository.owner}`,
      description: repository.description || `Análisis y alternativas para el repositorio de GitHub ${repository.fullName}.`,
      images: [
        {
          url: repository.avatarUrl || `https://via.placeholder.com/1200x630.png?text=${repository.name}`,
          width: 1200,
          height: 630,
          alt: `Avatar de ${repository.owner}`,
        },
      ],
      type: 'article',
      url: `https://github-repo-analyzer.vercel.app/${owner}/${repo}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${repository.name} por ${repository.owner}`,
      description: repository.description || `Análisis y alternativas para el repositorio de GitHub ${repository.fullName}.`,
      images: [repository.avatarUrl || `https://via.placeholder.com/1200x630.png?text=${repository.name}`],
    },
  };
}


// --- Componente de Página ---
export default async function RepoPage({ params }: { params: Promise<RepoPageParams> }) {
  const { owner, repo } = await params;
  const queryClient = new QueryClient();

  // Try to prefetch the data for better performance
  try {
    await queryClient.prefetchQuery({
      queryKey: ['repo', owner, repo],
      queryFn: () => getRepoAndAnalysis(owner, repo),    });
  } catch {
    // Don't fail the page if prefetch fails, let the client handle it
    console.log('Prefetch failed, letting client handle the request');
  }
  
  const dehydratedState = dehydrate(queryClient);

  return (
    <HydrationBoundary state={dehydratedState}>
      <RepoDetailsClient owner={owner} repoName={repo} />
    </HydrationBoundary>
  );
}