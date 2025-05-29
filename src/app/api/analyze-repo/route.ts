import { aiAnalyses as aiAnalysesTable, repositories as repositoriesTable } from '@/db/schema';
import { db } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
// Asumimos que tienes una función similar a getRepoAndAnalysis en el backend
// que puede ser llamada aquí. Por simplicidad, la lógica está inline.

// Debes crear esta función o adaptar la lógica de `getRepoAndAnalysis`
// para que funcione en este contexto de API Route.
// Esta es una versión simplificada y simulada.
async function fetchAndAnalyze(owner: string, repoName: string) {
  const fullName = `${owner}/${repoName}`;

  // Intenta obtener de la BD
  let repoRecord = await db.query.repositories.findFirst({
    where: eq(repositoriesTable.fullName, fullName),
  });
  let analysisRecord = null;

  if (repoRecord) {
    analysisRecord = await db.query.aiAnalyses.findFirst({
      where: eq(aiAnalysesTable.repositoryId, repoRecord.id),
    });
  }

  // Si no está en la BD o no tiene análisis, simula fetch y análisis
  if (!repoRecord || !analysisRecord) {
    console.log(`API: Simulando fetch de GitHub API para ${fullName}`);
    const mockGithubData = {
      name: repoName,
      owner: { login: owner, avatar_url: `https://avatars.githubusercontent.com/${owner}` },
      description: `(API) Una descripción simulada para ${repoName}.`,
      html_url: `https://github.com/${fullName}`,
      language: "JavaScript",
      stargazers_count: Math.floor(Math.random() * 1000)+1,
      forks_count: Math.floor(Math.random() * 500)+1,
    };

    let newRepoId: number;
    if (!repoRecord) {
        const inserted = await db.insert(repositoriesTable).values({
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
      newRepoId = inserted[0].id;
      repoRecord = await db.query.repositories.findFirst({ where: eq(repositoriesTable.id, newRepoId) });
    } else {
      newRepoId = repoRecord.id;
      // Actualizar datos del repo si ya existía pero no tenía análisis
       await db.update(repositoriesTable)
        .set({
          description: mockGithubData.description, // Actualizar por si cambió
          stars: mockGithubData.stargazers_count,
          forks: mockGithubData.forks_count,
          primaryLanguage: mockGithubData.language,
          updatedAt: new Date(),
        })
        .where(eq(repositoriesTable.id, newRepoId));
        repoRecord = await db.query.repositories.findFirst({ where: eq(repositoriesTable.id, newRepoId) });
    }


    if (!analysisRecord) {
      console.log(`API: Simulando análisis de IA para ${fullName}`);
      const mockAiAnalysis = {
        alternatives: [
          { name: "(API) Alt 1", url: "https://example.com/alt1-api", description: "API alt desc." },
        ],
        category: "Herramientas (API)",
        analysisContent: `(API) Análisis simulado para ${repoName}.`,
      };
      await db.insert(aiAnalysesTable).values({
        repositoryId: newRepoId,
        alternatives: mockAiAnalysis.alternatives,
        category: mockAiAnalysis.category,
        analysisContent: mockAiAnalysis.analysisContent,
      });
      analysisRecord = await db.query.aiAnalyses.findFirst({ where: eq(aiAnalysesTable.repositoryId, newRepoId) });
    }
  }
  
  return { repoData: repoRecord, analysisData: analysisRecord };
}


export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const owner = searchParams.get('owner');
  const repo = searchParams.get('repo');

  if (!owner || !repo) {
    return NextResponse.json({ message: 'Parámetros owner y repo son requeridos' }, { status: 400 });
  }

  try {
    const data = await fetchAndAnalyze(owner, repo);
    if (!data.repoData) {
      return NextResponse.json({ message: 'Repositorio no encontrado' }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error en API analyze-repo:", error);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}