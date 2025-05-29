import { aiAnalyses as aiAnalysesTable, repositories as repositoriesTable, type Alternative } from '@/db/schema';
import { AIAnalysisService } from '@/lib/ai-analysis';
import { db } from '@/lib/db';
import { GitHubService } from '@/lib/github';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

const githubService = new GitHubService();
const aiService = new AIAnalysisService();

async function fetchAndAnalyze(owner: string, repoName: string, forceRefresh: boolean = false) {
  const fullName = `${owner}/${repoName}`;

  try {
    // Check if we already have this repo and analysis in the database
    let repoRecord = await db.query.repositories.findFirst({
      where: eq(repositoriesTable.fullName, fullName),
    });
    
    let analysisRecord = null;
    if (repoRecord) {
      analysisRecord = await db.query.aiAnalyses.findFirst({
        where: eq(aiAnalysesTable.repositoryId, repoRecord.id),
      });
    }

    // If we have both repo and analysis, return them (unless they're old or we're forcing refresh)
    if (repoRecord && analysisRecord && !forceRefresh) {
      const daysSinceAnalysis = (Date.now() - new Date(analysisRecord.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceAnalysis < 7) { // Cache for 7 days
        console.log(`Using cached analysis for ${fullName}`);
        return { repoData: repoRecord, analysisData: analysisRecord };
      }
    }

    // Fetch fresh data from GitHub
    console.log(`Fetching GitHub data for ${fullName}`);
    const githubData = await githubService.fetchRepository(owner, repoName);
      // Get repository topics if available
    const topics = await githubService.getRepositoryTopics(owner, repoName);
    githubData.topics = topics;
    
    let newRepoId: number;
    
    if (!repoRecord) {
      // Insert new repository with race condition handling
      try {        const inserted = await db.insert(repositoriesTable).values({
          owner: githubData.owner.login,
          name: githubData.name,
          fullName: fullName,
          description: githubData.description,
          githubUrl: githubData.html_url,
          avatarUrl: githubData.owner.avatar_url,
          primaryLanguage: githubData.language,
          stars: githubData.stargazers_count,
          forks: githubData.forks_count,
        }).returning({ id: repositoriesTable.id });
        
        newRepoId = inserted[0].id;      } catch (error: unknown) {
        // Handle race condition - another request may have inserted the same repo
        if (error && typeof error === 'object' && 'code' in error && 'constraint' in error && 
            error.code === '23505' && error.constraint === 'repositories_full_name_unique') {
          console.log(`Repository ${fullName} was inserted by another request, fetching existing record`);
          // Fetch the existing repository
          const existingRepo = await db.query.repositories.findFirst({
            where: eq(repositoriesTable.fullName, fullName),
          });
          
          if (!existingRepo) {
            throw new Error(`Repository ${fullName} was inserted but could not be retrieved`);
          }
          
          newRepoId = existingRepo.id;
          repoRecord = existingRepo;
        } else {
          throw error; // Re-throw if it's a different error
        }
      }
        if (!repoRecord) {
        repoRecord = await db.query.repositories.findFirst({
          where: eq(repositoriesTable.id, newRepoId) 
        });
      }
    } else {
      newRepoId = repoRecord.id;
      // Update existing repository data
      await db.update(repositoriesTable)
        .set({
          description: githubData.description,
          stars: githubData.stargazers_count,
          forks: githubData.forks_count,
          primaryLanguage: githubData.language,
          updatedAt: new Date(),
        })
        .where(eq(repositoriesTable.id, newRepoId));
      
      repoRecord = await db.query.repositories.findFirst({ 
        where: eq(repositoriesTable.id, newRepoId) 
      });
    }    // Check if repo exists but no analysis (may indicate analysis in progress by another request)
    if (repoRecord && !analysisRecord && !forceRefresh) {
      // Check if this repo was created very recently (within last 2 minutes)
      const repoAge = Date.now() - new Date(repoRecord.createdAt).getTime();
      if (repoAge < 2 * 60 * 1000) { // 2 minutes
        // Likely analysis in progress, throw a specific error
        throw new Error('ANALYSIS_IN_PROGRESS');
      }
    }

    // Generate AI analysis if we don't have one or it's outdated or we're forcing refresh
    if (!analysisRecord || forceRefresh || (Date.now() - new Date(analysisRecord.createdAt).getTime()) / (1000 * 60 * 60 * 24) >= 7) {
      console.log(`${forceRefresh ? 'Force refreshing' : 'Generating'} AI analysis for ${fullName}`);
      
      try {
        const aiAnalysis = await aiService.analyzeRepository(githubData);
          if (analysisRecord) {          // Update existing analysis
          await db.update(aiAnalysesTable)
            .set({
              alternatives: aiAnalysis.alternatives as Alternative[],
              category: aiAnalysis.category,
              summary: aiAnalysis.summary,
              strengths: aiAnalysis.strengths,
              considerations: aiAnalysis.considerations,
              useCase: aiAnalysis.useCase,
              targetAudience: aiAnalysis.targetAudience,
              analysisContent: `${aiAnalysis.summary}\n\nStrengths: ${aiAnalysis.strengths.join(', ')}\n\nConsiderations: ${aiAnalysis.considerations.join(', ')}\n\nUse Case: ${aiAnalysis.useCase}\n\nTarget Audience: ${aiAnalysis.targetAudience}`,
              updatedAt: new Date(),
            })
            .where(eq(aiAnalysesTable.id, analysisRecord.id));        } else {
          // Insert new analysis
          await db.insert(aiAnalysesTable).values({
            repositoryId: newRepoId,
            alternatives: aiAnalysis.alternatives as Alternative[],
            category: aiAnalysis.category,
            summary: aiAnalysis.summary,
            strengths: aiAnalysis.strengths,
            considerations: aiAnalysis.considerations,
            useCase: aiAnalysis.useCase,
            targetAudience: aiAnalysis.targetAudience,
            analysisContent: `${aiAnalysis.summary}\n\nStrengths: ${aiAnalysis.strengths.join(', ')}\n\nConsiderations: ${aiAnalysis.considerations.join(', ')}\n\nUse Case: ${aiAnalysis.useCase}\n\nTarget Audience: ${aiAnalysis.targetAudience}`,
          });
        }
        
        analysisRecord = await db.query.aiAnalyses.findFirst({ 
          where: eq(aiAnalysesTable.repositoryId, newRepoId) 
        });
      } catch (aiError) {
        console.error('AI analysis failed:', aiError);
        // Create a fallback analysis
        const fallbackAnalysis = {
          alternatives: [
            { 
              name: "Search GitHub", 
              url: `https://github.com/search?q=${encodeURIComponent(`${githubData.language || ''} ${githubData.description || githubData.name}`)}`,
              description: "Search for similar projects on GitHub",
              reasoning: "Manual search for alternatives"
            }
          ],
          category: githubData.language || "Software",
          analysisContent: `Analysis for ${githubData.name}: ${githubData.description || 'No description available.'}`
        };
        
        if (analysisRecord) {
          await db.update(aiAnalysesTable)
            .set(fallbackAnalysis)
            .where(eq(aiAnalysesTable.id, analysisRecord.id));
        } else {
          await db.insert(aiAnalysesTable).values({
            repositoryId: newRepoId,
            ...fallbackAnalysis,
          });
        }
        
        analysisRecord = await db.query.aiAnalyses.findFirst({ 
          where: eq(aiAnalysesTable.repositoryId, newRepoId) 
        });
      }
    }
    
    return { repoData: repoRecord, analysisData: analysisRecord };
    
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Unknown error occurred while fetching and analyzing repository');
  }
}


export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const owner = searchParams.get('owner');
  const repo = searchParams.get('repo');
  const forceRefresh = searchParams.get('forceRefresh') === 'true';

  if (!owner || !repo) {
    return NextResponse.json({ 
      message: 'Parameters owner and repo are required' 
    }, { status: 400 });
  }

  try {
    const data = await fetchAndAnalyze(owner, repo, forceRefresh);
    
    if (!data.repoData) {
      return NextResponse.json({ 
        message: 'Repository not found' 
      }, { status: 404 });
    }

    // Return structured response
    return NextResponse.json({
      repository: data.repoData,
      analysis: data.analysisData,
      success: true
    });
  } catch (error) {
    console.error("Error in API analyze-repo:", error);
    
    // Handle specific GitHub API errors
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json({ 
          message: 'Repository not found on GitHub',
          error: error.message 
        }, { status: 404 });
      }
      
      if (error.message.includes('rate limit')) {
        return NextResponse.json({ 
          message: 'GitHub API rate limit exceeded. Please try again later.',
          error: error.message 
        }, { status: 429 });
      }
      
      return NextResponse.json({ 
        message: 'Error analyzing repository',
        error: error.message 
      }, { status: 500 });
    }
      return NextResponse.json({ 
      message: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { owner, repo, forceRefresh = false } = body;

    if (!owner || !repo) {
      return NextResponse.json(
        { error: 'Owner and repo parameters are required' },
        { status: 400 }
      );
    }
    
    const data = await fetchAndAnalyze(owner, repo, forceRefresh);
    
    if (!data.repoData) {
      return NextResponse.json({ 
        error: 'Repository not found',
        success: false 
      }, { status: 404 });
    }

    // Return structured response matching client expectations
    return NextResponse.json({
      repository: data.repoData,
      analysis: data.analysisData,
      success: true
    });  } catch (error) {
    console.error('Error in POST /api/analyze-repo:', error);
    
    // Check if this is an analysis in progress error
    if (error instanceof Error && error.message === 'ANALYSIS_IN_PROGRESS') {
      return NextResponse.json({
        error: 'ANALYSIS_IN_PROGRESS',
        success: false,
        message: 'Repository analysis is currently in progress. Please wait a moment and refresh.'
      }, { status: 202 }); // 202 Accepted - request is being processed
    }
    
    // Check if this is a race condition error during concurrent requests
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      // This is likely a concurrent request scenario - return analysis in progress status
      return NextResponse.json({
        error: 'ANALYSIS_IN_PROGRESS',
        success: false,
        message: 'Repository analysis is currently in progress. Please wait a moment and refresh.'
      }, { status: 202 }); // 202 Accepted - request is being processed
    }
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        success: false 
      },
      { status: 500 }
    );
  }
}