"use client";

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRepositories, useRepositoriesStats } from '@/hooks/use-repositories';
import { AlertCircle, Calendar, ExternalLink, Filter, GitFork, Github, Loader2, Search, Star, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

export default function RepositoriesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('stars');
  
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // TanStack Query para repositorios con infinite scroll
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    isPending,
    isError,
  } = useRepositories({
    search: debouncedSearchTerm,
    language: languageFilter,
    sortBy,
  });

  // Hook para obtener estadísticas
  const getStats = useRepositoriesStats();
  const stats = useMemo(() => getStats(), [data, getStats]);

  // Infinite scroll con Intersection Observer
  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'k':
            event.preventDefault();
            document.getElementById('search-input')?.focus();
            break;
          case '/':
            event.preventDefault();
            document.getElementById('search-input')?.focus();
            break;
        }
      }
      if (event.key === 'Escape') {
        setSearchTerm('');
        setLanguageFilter('all');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Obtener todos los repositorios de todas las páginas
  const allRepositories = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap(page => page.repositories);
  }, [data]);

  // Obtener lenguajes disponibles de los repositorios cargados
  const availableLanguages = useMemo(() => {
    const languages = allRepositories
      .map(repo => repo.primaryLanguage)
      .filter(Boolean)
      .filter((lang, index, arr) => arr.indexOf(lang) === index)
      .sort();
    return languages;
  }, [allRepositories]);

  const formatDate = (date: string | Date | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatNumber = (num: number | null) => {
    if (num === null || num === undefined) return '0';
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  };

  // Estados de carga
  if (isPending) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-8">Repositorios Analizados</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-300 rounded w-24"></div>
                      <div className="h-3 bg-gray-300 rounded w-16"></div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="h-3 bg-gray-300 rounded"></div>
                    <div className="h-3 bg-gray-300 rounded w-3/4"></div>
                    <div className="flex gap-2">
                      <div className="h-6 bg-gray-300 rounded w-12"></div>
                      <div className="h-6 bg-gray-300 rounded w-12"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-8">Repositorios Analizados</h1>
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center space-y-4">
                <AlertCircle className="h-12 w-12 text-destructive" />
                <p className="text-lg font-medium">Error al cargar repositorios</p>
                <p className="text-sm text-muted-foreground">
                  {error instanceof Error ? error.message : 'Error desconocido'}
                </p>
                <Button onClick={() => window.location.reload()}>
                  Reintentar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (allRepositories.length === 0 && !isFetching) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-8">Repositorios Analizados</h1>
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center space-y-4">
                <Github className="h-12 w-12 text-muted-foreground" />
                <p className="text-lg font-medium">No hay repositorios analizados</p>
                <p className="text-sm text-muted-foreground">
                  Comienza analizando tu primer repositorio
                </p>
                <Button asChild>
                  <Link href="/">Analizar Repositorio</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">Repositorios Analizados</h1>
        <p className="text-lg text-muted-foreground mb-4">
          {stats?.totalRepositories || allRepositories.length} repositorio{(stats?.totalRepositories || allRepositories.length) !== 1 ? 's' : ''} en la base de datos
        </p>
        
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto mb-6">
            <Card className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">{formatNumber(stats.totalStars)}</p>
                <p className="text-sm text-muted-foreground">⭐ Total Stars</p>
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{formatNumber(stats.totalForks)}</p>
                <p className="text-sm text-muted-foreground">🍴 Total Forks</p>
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{stats.totalLanguages}</p>
                <p className="text-sm text-muted-foreground">💻 Lenguajes</p>
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">{stats.topLanguage}</p>
                <p className="text-sm text-muted-foreground">🏆 Top Lenguaje</p>
              </div>
            </Card>
          </div>
        )}
        
        <Button asChild variant="outline">
          <Link href="/">+ Analizar Nuevo Repositorio</Link>
        </Button>
      </div>

      {/* Search and Filter Controls */}
      <div className="mb-8 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            {searchTerm !== debouncedSearchTerm && (
              <Loader2 className="absolute right-10 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 animate-spin" />
            )}
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setSearchTerm('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            <Input
              id="search-input"
              placeholder="Buscar por nombre, owner, descripción... (Ctrl+K)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-10"
            />
          </div>
          <div className="flex gap-2">
            <Select value={languageFilter} onValueChange={setLanguageFilter}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar por lenguaje" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los lenguajes</SelectItem>
                {availableLanguages.map((lang) => (
                  <SelectItem key={lang} value={lang!}>
                    {lang}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stars">⭐ Stars</SelectItem>
                <SelectItem value="forks">🍴 Forks</SelectItem>
                <SelectItem value="updated">📅 Actualización</SelectItem>
                <SelectItem value="name">📝 Nombre</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      {(debouncedSearchTerm || languageFilter !== 'all') && (
        <div className="mb-6">
          <p className="text-sm text-muted-foreground">
            Mostrando {allRepositories.length} repositorios
            {debouncedSearchTerm && ` que coinciden con "${debouncedSearchTerm}"`}
            {languageFilter !== 'all' && ` en ${languageFilter}`}
            {isFetching && !isFetchingNextPage && (
              <span className="ml-2">
                <Loader2 className="h-4 w-4 animate-spin inline" />
              </span>
            )}
          </p>
        </div>
      )}

      {/* No Results */}
      {allRepositories.length === 0 && !isFetching && (
        <div className="text-center py-12">
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center space-y-4">
                <Search className="h-12 w-12 text-muted-foreground" />
                <p className="text-lg font-medium">No se encontraron repositorios</p>
                <p className="text-sm text-muted-foreground">
                  Intenta con otros términos de búsqueda o filtros
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm('');
                    setLanguageFilter('all');
                  }}
                >
                  Limpiar filtros
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Repository Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {allRepositories.map((repo, index) => (
          <Card 
            key={repo.id} 
            className="hover:shadow-lg transition-all duration-200 group animate-in fade-in-0 slide-in-from-bottom-4"
            style={{ animationDelay: `${(index % 12) * 50}ms` }}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarImage src={repo.avatarUrl || undefined} alt={repo.owner} />
                    <AvatarFallback>{repo.owner.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-sm font-semibold truncate">
                      {repo.name}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      por {repo.owner}
                    </CardDescription>
                  </div>
                </div>
                {repo.isArchived && (
                  <Badge variant="secondary" className="text-xs">
                    Archivado
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                {repo.description || 'Sin descripción disponible'}
              </p>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span>{formatNumber(repo.stars)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <GitFork className="h-4 w-4 text-blue-500" />
                    <span>{formatNumber(repo.forks)}</span>
                  </div>
                  {repo.openIssues !== null && repo.openIssues > 0 && (
                    <div className="flex items-center space-x-1">
                      <AlertCircle className="h-4 w-4 text-orange-500" />
                      <span>{formatNumber(repo.openIssues)}</span>
                    </div>
                  )}
                </div>
              </div>

              {repo.primaryLanguage && (
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-xs">
                    {repo.primaryLanguage}
                  </Badge>
                </div>
              )}

              {repo.topics && Array.isArray(repo.topics) && repo.topics.length > 0 && (
                <div className="flex flex-wrap gap-1 max-h-16 overflow-hidden">
                  {repo.topics.slice(0, 3).map((topic) => (
                    <Badge key={topic} variant="secondary" className="text-xs">
                      {topic}
                    </Badge>
                  ))}
                  {repo.topics.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{repo.topics.length - 3}
                    </Badge>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <Calendar className="h-3 w-3" />
                  <span>Act. {formatDate(repo.githubUpdatedAt)}</span>
                </div>
                {repo.license && (
                  <span className="truncate max-w-20">{repo.license}</span>
                )}
              </div>

              <div className="flex space-x-2 pt-2">
                <Button asChild size="sm" className="flex-1">
                  <Link href={`/${repo.owner}/${repo.name}`}>
                    Ver Análisis
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href={repo.githubUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Load More Trigger (Invisible) */}
      {hasNextPage && (
        <div ref={loadMoreRef} className="h-20 flex items-center justify-center mt-8">
          {isFetchingNextPage && (
            <div className="flex items-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-muted-foreground">Cargando más repositorios...</span>
            </div>
          )}
        </div>
      )}

      {/* End Message */}
      {!hasNextPage && allRepositories.length > 0 && (
        <div className="text-center mt-8 py-4">
          <p className="text-muted-foreground">¡Has visto todos los repositorios disponibles!</p>
        </div>
      )}
    </div>
  );
}
