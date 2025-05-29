import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { db } from "@/lib/db";
import { repositories as repositoriesTable, aiAnalyses as aiAnalysesTable } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { Github, GitFork, Star, AlertTriangle, ExternalLink, Lightbulb, Users, BookOpen } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from '@tanstack/react-query'
import RepoDetailsClient from "./repo-details-client";

// --- Tipos para los datos ---
interface RepoPageParams {
  owner: string;
  repo: string;
}

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
  createdAt: Date;
  updatedAt: Date;
}

interface AnalysisData {
  id: number;
  alternatives: Array<{ name: string; url: string; description?: string }> | null;
  category: string | null;
  analysisContent: string | null;
  createdAt: Date;
}

// --- Función para obtener datos del repositorio y análisis ---
async function getRepoAndAnalysis(owner: string, repoName: string): Promise<{ repoData: RepoData | null; analysisData: AnalysisData | null }> {
  const fullName = `${owner}/${repoName}`;

  // Primero, intenta obtener el repositorio de la base de datos
  const existingRepo = await db.query.repositories.findFirst({
    where: eq(repositoriesTable.fullName, fullName),
  });

  if (existingRepo) {
    // Si el repositorio existe, intenta obtener su análisis
    const existingAnalysis = await db.query.aiAnalyses.findFirst({
      where: eq(aiAnalysesTable.repositoryId, existingRepo.id),
    });
    return { repoData: existingRepo, analysisData: existingAnalysis || null };
  }

  // Si no está en la BD, aquí iría la lógica para llamar a la API de GitHub
  // y luego a la IA. Por ahora, simularemos esto.
  console.log(`Simulando fetch de GitHub API para ${fullName}`);
  // Simulación de datos de GitHub
  const mockGithubData = {
    name: repoName,
    owner: { login: owner, avatar_url: `https://avatars.githubusercontent.com/${owner}` },
    description: `Una descripción simulada para el repositorio ${repoName}.`,
    html_url: `https://github.com/${fullName}`,
    language: "TypeScript", // Simulación
    stargazers_count: Math.floor(Math.random() * 5000),
    forks_count: Math.floor(Math.random() * 1000),
  };

  // Guardar en la BD (simulación)
  let newRepoId: number;
  try {
    const insertedRepo = await db.insert(repositoriesTable).values({
      owner: mockGithubData.owner.login,
      name: mockGithubData.name,
      fullName: fullName,
      description: mockGithubData.description,
      githubUrl: mockGithubData.html_url,
      avatarUrl: mockGithubData.owner.avatar_url,
      primaryLanguage: mockGithubData.language,
      stars: mockGithubData.stargazers_count,
      forks: mockGithubData.forks_count,
    }).returning({ id: repositoriesTable.id });
    
    if (!insertedRepo || insertedRepo.length === 0) {
      throw new Error("No se pudo insertar el repositorio en la BD");
    }
    newRepoId = insertedRepo[0].id;

  } catch (error) {
    console.error("Error al insertar repositorio:", error);
    // Si falla la inserción (ej. por constraint de unicidad si hubo una race condition)
    // intenta obtenerlo de nuevo, podría haber sido insertado por otra request.
    const raceConditionRepo = await db.query.repositories.findFirst({
      where: eq(repositoriesTable.fullName, fullName),
    });
    if (raceConditionRepo) {
      newRepoId = raceConditionRepo.id;
    } else {
      // Si aún no existe, es un error real
      return { repoData: null, analysisData: null }; // O manejar el error de otra forma
    }
  }
  

  // Simulación de análisis de IA
  console.log(`Simulando análisis de IA para ${fullName}`);
  const mockAiAnalysis = {
    alternatives: [
      { name: "Alternativa Simulada 1", url: "https://example.com/alt1", description: "Una buena alternativa." },
      { name: "Alternativa Simulada 2", url: "https://example.com/alt2" },
    ],
    category: "Herramientas de Desarrollo (Simulado)",
    analysisContent: `Este es un análisis simulado generado por IA para ${repoName}. Es un proyecto muy prometedor con potencial en el área de ${mockGithubData.language}. Sus principales casos de uso incluyen A, B y C. Se compara favorablemente con otras herramientas, aunque podría mejorar en X aspecto.`,
  };

  // Guardar análisis en la BD (simulación)
  await db.insert(aiAnalysesTable).values({
    repositoryId: newRepoId,
    alternatives: mockAiAnalysis.alternatives,
    category: mockAiAnalysis.category,
    analysisContent: mockAiAnalysis.analysisContent,
  });

  const finalRepoData = await db.query.repositories.findFirst({
    where: eq(repositoriesTable.id, newRepoId),
  });
   const finalAnalysisData = await db.query.aiAnalyses.findFirst({
      where: eq(aiAnalysesTable.repositoryId, newRepoId),
    });

  return { repoData: finalRepoData || null, analysisData: finalAnalysisData || null };
}

// --- Metadata Dinámica ---
export async function generateMetadata({ params }: { params: RepoPageParams }) {
  const { owner, repo } = params;
  // En un caso real, obtendrías solo la info necesaria para el metadata
  // de la BD o una llamada ligera a la API de GitHub si no está en BD.
  // Por ahora, usamos la función completa y extraemos de ahí.
  const { repoData } = await getRepoAndAnalysis(owner, repo);

  if (!repoData) {
    return {
      title: "Repositorio no encontrado",
    };
  }

  return {
    title: `${repoData.name} por ${repoData.owner} - GitHub Analyzer`,
    description: repoData.description || `Análisis y alternativas para el repositorio de GitHub ${repoData.fullName}.`,
    openGraph: {
      title: `${repoData.name} por ${repoData.owner}`,
      description: repoData.description || `Análisis y alternativas para el repositorio de GitHub ${repoData.fullName}.`,
      images: [
        {
          url: repoData.avatarUrl || `https://via.placeholder.com/1200x630.png?text=${repoData.name}`,
          width: 1200,
          height: 630,
          alt: `Avatar de ${repoData.owner}`,
        },
      ],
      type: 'article', // O 'website'
      url: `https://TU_DOMINIO.com/${owner}/${repo}`, // Reemplaza con tu dominio real
    },
    twitter: {
      card: 'summary_large_image',
      title: `${repoData.name} por ${repoData.owner}`,
      description: repoData.description || `Análisis y alternativas para el repositorio de GitHub ${repoData.fullName}.`,
      images: [repoData.avatarUrl || `https://via.placeholder.com/1200x630.png?text=${repoData.name}`],
    },
  };
}


// --- Componente de Página ---
export default async function RepoPage({ params }: { params: RepoPageParams }) {
  const { owner, repo } = params;
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: ['repo', owner, repo],
    queryFn: () => getRepoAndAnalysis(owner, repo),
  });
  
  const dehydratedState = dehydrate(queryClient);

  return (
    <HydrationBoundary state={dehydratedState}>
      <RepoDetailsClient owner={owner} repoName={repo} />
    </HydrationBoundary>
  );
}