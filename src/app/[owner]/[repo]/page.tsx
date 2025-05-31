import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from '@tanstack/react-query';
import { getRepositoryInfo } from '@/lib/repository';
import RepoDetailsClient from './repo-details-client';

// --- Tipos para los datos ---
interface RepoPageParams {
  owner: string;
  repo: string;
}

// --- Metadata Dinámica Simplificada ---
export async function generateMetadata({
  params,
}: { params: Promise<RepoPageParams> }) {
  const { owner, repo } = await params;

  try {
    const data = await getRepositoryInfo(owner, repo);

    if (!data || !data.repository) {
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
    console.error('Error generating metadata:', error);
    return {
      title: `${repo} por ${owner} - GitHub Analyzer`,
      description: `Analyzing GitHub repository ${owner}/${repo}. Please wait while we generate insights and alternatives.`,
    };
  }
}

// --- Componente de Página Simplificado ---
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

  // Intentar prefetch de datos básicos del repositorio
  try {
    await queryClient.prefetchQuery({
      queryKey: ['repository-info', owner, repo],
      queryFn: () => getRepositoryInfo(owner, repo),
      staleTime: 1000 * 60 * 5, // 5 minutos
      gcTime: 1000 * 60 * 60, // 1 hora
    });

    console.log(
      `Server: Successfully prefetched repository info for ${owner}/${repo}`,
    );
  } catch (error) {
    // Log del error pero no fallar la página
    console.log('Server: Prefetch failed, client will handle the request:', {
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
