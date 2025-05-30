"use client";

import type { Repository } from '@/db/schema';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';

interface RepositoriesResponse {
  success: boolean;
  repositories: Repository[];
  hasNextPage: boolean;
  nextPage: number | null;
  total: number;
  page: number;
  pageSize: number;
  error?: string;
}

interface UseRepositoriesParams {
  search?: string;
  language?: string;
  sortBy?: string;
}

const fetchRepositories = async ({ 
  pageParam = 0, 
  search = '', 
  language = 'all', 
  sortBy = 'stars' 
}: { 
  pageParam: number; 
  search?: string; 
  language?: string; 
  sortBy?: string; 
}): Promise<RepositoriesResponse> => {
  const params = new URLSearchParams({
    page: pageParam.toString(),
    search,
    language,
    sortBy,
  });

  const response = await fetch(`/api/repositories?${params}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch repositories');
  }
  
  return response.json();
};

export const useRepositories = ({ search = '', language = 'all', sortBy = 'stars' }: UseRepositoriesParams = {}) => {
  return useInfiniteQuery({
    queryKey: ['repositories', { search, language, sortBy }],
    queryFn: ({ pageParam = 0 }) => 
      fetchRepositories({ pageParam, search, language, sortBy }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.hasNextPage ? lastPage.nextPage : undefined,
    staleTime: 1000 * 60 * 5, // 5 minutos de cache
  });
};

// Hook para invalidar el cache de repositorios cuando se agrega uno nuevo
export const useInvalidateRepositories = () => {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.invalidateQueries({
      queryKey: ['repositories'],
    });
  };
};

// Hook para obtener estadísticas de todos los repositorios
export const useRepositoriesStats = () => {
  const queryClient = useQueryClient();
  
  // Obtener todos los repositorios del cache
  const getAllRepositoriesFromCache = (): Repository[] => {
    const queryData = queryClient.getQueriesData({ queryKey: ['repositories'] });
    const allRepos: Repository[] = [];
    
    queryData.forEach(([, data]) => {
      if (data && typeof data === 'object' && 'pages' in data) {
        const infiniteData = data as { pages: RepositoriesResponse[] };
        infiniteData.pages.forEach(page => {
          if (page.repositories) {
            allRepos.push(...page.repositories);
          }
        });
      }
    });
    
    // Eliminar duplicados basado en el ID
    const uniqueRepos = allRepos.filter((repo, index, arr) => 
      arr.findIndex(r => r.id === repo.id) === index
    );
    
    return uniqueRepos;
  };

  return () => {
    const repositories = getAllRepositoriesFromCache();
    
    if (repositories.length === 0) return null;
    
    const totalStars = repositories.reduce((sum, repo) => sum + (repo.stars || 0), 0);
    const totalForks = repositories.reduce((sum, repo) => sum + (repo.forks || 0), 0);
    const languages = repositories
      .map(repo => repo.primaryLanguage)
      .filter(Boolean)
      .reduce((acc, lang) => {
        acc[lang!] = (acc[lang!] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
    
    const topLanguage = Object.entries(languages)
      .sort(([,a], [,b]) => b - a)[0];
    
    return {
      totalStars,
      totalForks,
      topLanguage: topLanguage ? topLanguage[0] : 'N/A',
      totalLanguages: Object.keys(languages).length,
      totalRepositories: repositories.length,
      availableLanguages: Object.keys(languages).sort(),
    };
  };
};
