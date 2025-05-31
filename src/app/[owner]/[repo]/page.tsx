import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from '@tanstack/react-query';
import RepoDetailsClient from './repo-details-client';

// --- Tipos para los datos ---
interface RepoPageParams {
  owner: string;
  repo: string;
}

// --- Función para obtener datos del repositorio y análisis ---
async function getRepoAndAnalysis(owner: string, repoName: string) {
  try {
    // Construct absolute URL for server-side fetch
    // In production, relative URLs don't work in server components
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000'
        : `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL || 'localhost:3000'}`;

    const apiUrl = `${baseUrl}/api/analyze-repo`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ owner, repo: repoName }),
      cache: 'no-store', // Disable caching for fresh data
    });

    if (!response.ok) {
      // If it's a 202 or 500 error, it might be a race condition or analysis in progress
      if (response.status === 202 || response.status === 500) {
        console.log(`Analysis may be in progress for ${owner}/${repoName}`);
        return {
          success: false,
          error: 'ANALYSIS_IN_PROGRESS',
          repository: null,
          analysis: null,
        };
      }
      throw new Error(`Failed to analyze repository: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success) {
      // Don't throw an error for ANALYSIS_IN_PROGRESS, return the response as is
      if (data.error === 'ANALYSIS_IN_PROGRESS') {
        return data;
      }
      throw new Error(data.error || 'Failed to analyze repository');
    }

    return data;
  } catch (fetchError) {
    console.error('Error fetching repository analysis:', fetchError);

    // Handle specific error cases
    if (fetchError instanceof Error) {
      // For unauthorized errors, this could be a URL formation issue
      if (
        fetchError.message.includes('Unauthorized') ||
        fetchError.message.includes('401')
      ) {
        console.error(
          'Authorization error detected. This may be due to incorrect URL formation in production.',
        );
      }

      if (
        fetchError.message.includes(
          'Failed to analyze repository: Internal Server Error',
        )
      ) {
        return {
          success: false,
          error: 'ANALYSIS_IN_PROGRESS',
          repository: null,
          analysis: null,
        };
      }
    }

    return null;
  }
}

// --- Metadata Dinámica ---
export async function generateMetadata({
  params,
}: { params: Promise<RepoPageParams> }) {
  const { owner, repo } = await params;

  try {
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
      description:
        repository.description ||
        `Análisis y alternativas para el repositorio de GitHub ${repository.fullName}.`,
      openGraph: {
        title: `${repository.name} por ${repository.owner}`,
        description:
          repository.description ||
          `Análisis y alternativas para el repositorio de GitHub ${repository.fullName}.`,
        images: [
          {
            url:
              repository.avatarUrl ||
              `https://via.placeholder.com/1200x630.png?text=${repository.name}`,
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
        description:
          repository.description ||
          `Análisis y alternativas para el repositorio de GitHub ${repository.fullName}.`,
        images: [
          repository.avatarUrl ||
            `https://via.placeholder.com/1200x630.png?text=${repository.name}`,
        ],
      },
    };
  } catch (error) {
    // If metadata generation fails, return generic metadata
    console.error('Error generating metadata:', error);
    return {
      title: `${repo} por ${owner} - GitHub Analyzer`,
      description: `Analyzing GitHub repository ${owner}/${repo}. Please wait while we generate insights and alternatives.`,
    };
  }
}

// --- Componente de Página ---
export default async function RepoPage({
  params,
}: { params: Promise<RepoPageParams> }) {
  const { owner, repo } = await params;

  // Crear un QueryClient dedicado para esta página
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minuto
        gcTime: 1000 * 60 * 60 * 24, // 24 horas
      },
    },
  });

  // Intentar prefetch de datos - no fallar la página si esto falla
  try {
    await queryClient.prefetchQuery({
      queryKey: ['repo', owner, repo],
      queryFn: () => getRepoAndAnalysis(owner, repo),
      // No permitir que queries fallidas se mantengan en cache por mucho tiempo
      staleTime: 0,
      gcTime: 1000 * 60, // 1 minuto para errores
    });
  } catch (error) {
    // Log del error pero no fallar la página
    console.log('Prefetch failed, client will handle the request:', {
      owner,
      repo,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  const dehydratedState = dehydrate(queryClient);

  return (
    <HydrationBoundary state={dehydratedState}>
      <RepoDetailsClient owner={owner} repoName={repo} />
    </HydrationBoundary>
  );
}
