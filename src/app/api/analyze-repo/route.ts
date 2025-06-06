import {
  aiAnalyses as aiAnalysesTable,
  repositories as repositoriesTable,
  type Alternative,
} from '@/db/schema';
import { AIAnalysisService } from '@/lib/ai-analysis';
import { db } from '@/lib/db';
import { GitHubService } from '@/lib/github';
import { eq } from 'drizzle-orm';
import { NextResponse, type NextRequest } from 'next/server';
import { getRepositoryInfo } from '@/lib/repository';

const githubService = new GitHubService();
const aiService = new AIAnalysisService();

async function fetchAndAnalyze(
  owner: string,
  repoName: string,
  forceRefresh = false,
) {
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
      const daysSinceAnalysis =
        (Date.now() - new Date(analysisRecord.createdAt).getTime()) /
        (1000 * 60 * 60 * 24);
      if (daysSinceAnalysis < 7) {
        // Cache for 7 days
        console.log(`Using cached analysis for ${fullName}`);
        return { repoData: repoRecord, analysisData: analysisRecord };
      }
    }

    // If we don't have the repository, get it first using the repository utility
    if (!repoRecord) {
      try {
        console.log(
          `Repository not in database, using repository utility for ${fullName}`,
        );

        const repoInfoResult = await getRepositoryInfo(owner, repoName);

        if (repoInfoResult.success && repoInfoResult.repository) {
          console.log(
            `Successfully retrieved repository from utility: ${fullName}`,
          );
          // The utility already saved it to the database, so fetch it
          repoRecord = await db.query.repositories.findFirst({
            where: eq(repositoriesTable.fullName, fullName),
          });
        }
      } catch (repoInfoError) {
        console.warn(
          `Failed to get repository from utility: ${fullName}`,
          repoInfoError,
        );
      }
    }

    // If we still don't have the repository, try direct GitHub fetch as fallback
    if (!repoRecord) {
      console.log(`Fallback: Fetching GitHub data directly for ${fullName}`);
      const githubData = await githubService.fetchRepository(owner, repoName);

      // Get repository topics if available
      const topics = await githubService.getRepositoryTopics(owner, repoName);
      githubData.topics = topics;

      // Save repository to database
      try {
        const upsertResult = await db
          .insert(repositoriesTable)
          .values({
            owner: githubData.owner.login,
            name: githubData.name,
            fullName: fullName,
            description: githubData.description,
            githubUrl: githubData.html_url,
            avatarUrl: githubData.owner.avatar_url,
            primaryLanguage: githubData.language,
            stars: githubData.stargazers_count,
            forks: githubData.forks_count,
            openIssues: githubData.open_issues_count,
            size: githubData.size,
            topics: githubData.topics,
            license: githubData.license?.name || null,
            isArchived: githubData.archived,
            isDisabled: githubData.disabled,
            defaultBranch: githubData.default_branch,
            githubCreatedAt: new Date(githubData.created_at),
            githubUpdatedAt: new Date(githubData.updated_at),
            githubPushedAt: new Date(githubData.pushed_at),
          })
          .onConflictDoUpdate({
            target: repositoriesTable.fullName,
            set: {
              description: githubData.description,
              stars: githubData.stargazers_count,
              forks: githubData.forks_count,
              primaryLanguage: githubData.language,
              openIssues: githubData.open_issues_count,
              size: githubData.size,
              topics: githubData.topics,
              license: githubData.license?.name || null,
              isArchived: githubData.archived,
              isDisabled: githubData.disabled,
              defaultBranch: githubData.default_branch,
              githubCreatedAt: new Date(githubData.created_at),
              githubUpdatedAt: new Date(githubData.updated_at),
              githubPushedAt: new Date(githubData.pushed_at),
              updatedAt: new Date(),
            },
          })
          .returning({ id: repositoriesTable.id });

        const repoId = upsertResult[0].id;
        repoRecord = await db.query.repositories.findFirst({
          where: eq(repositoriesTable.id, repoId),
        });
      } catch (error: unknown) {
        console.error(`Error upserting repository ${fullName}:`, error);
        // Fallback: try to fetch existing record
        repoRecord = await db.query.repositories.findFirst({
          where: eq(repositoriesTable.fullName, fullName),
        });
        if (!repoRecord) {
          throw new Error(
            `Failed to create or retrieve repository ${fullName}`,
          );
        }
      }
    } else if (forceRefresh) {
      // If we have the repository but are forcing refresh, update repository data
      try {
        console.log(
          `Force refreshing repository data from GitHub for ${fullName}`,
        );
        const githubData = await githubService.fetchRepository(owner, repoName);
        const topics = await githubService.getRepositoryTopics(owner, repoName);
        githubData.topics = topics;

        await db
          .update(repositoriesTable)
          .set({
            description: githubData.description,
            stars: githubData.stargazers_count,
            forks: githubData.forks_count,
            primaryLanguage: githubData.language,
            openIssues: githubData.open_issues_count,
            size: githubData.size,
            topics: githubData.topics,
            license: githubData.license?.name || null,
            isArchived: githubData.archived,
            isDisabled: githubData.disabled,
            defaultBranch: githubData.default_branch,
            githubCreatedAt: new Date(githubData.created_at),
            githubUpdatedAt: new Date(githubData.updated_at),
            githubPushedAt: new Date(githubData.pushed_at),
            updatedAt: new Date(),
          })
          .where(eq(repositoriesTable.id, repoRecord.id));

        // Refresh the record
        const updated = await db.query.repositories.findFirst({
          where: eq(repositoriesTable.id, repoRecord.id),
        });
        if (updated) repoRecord = updated;
      } catch (error) {
        console.error(`Error updating repository ${fullName}:`, error);
        // Continue with existing record if update fails
      }
    }

    if (!repoRecord) {
      throw new Error(`Failed to create or retrieve repository ${fullName}`);
    }

    // Generate AI analysis if we don't have one or it's outdated or we're forcing refresh
    if (
      !analysisRecord ||
      forceRefresh ||
      (Date.now() - new Date(analysisRecord.createdAt).getTime()) /
        (1000 * 60 * 60 * 24) >=
        7
    ) {
      console.log(
        `${forceRefresh ? 'Force refreshing' : analysisRecord ? 'Refreshing outdated' : 'Generating new'} AI analysis for ${fullName}`,
      );

      try {
        // Convert repository record to GitHubRepo format for AI analysis
        const githubRepoData = {
          name: repoRecord.name,
          owner: { login: repoRecord.owner },
          description: repoRecord.description,
          language: repoRecord.primaryLanguage,
          stargazers_count: repoRecord.stars || 0,
          forks_count: repoRecord.forks || 0,
          topics: repoRecord.topics || [],
          html_url: repoRecord.githubUrl,
        };

        const aiAnalysis = await aiService.analyzeRepository(githubRepoData);

        if (analysisRecord) {
          // Update existing analysis
          await db
            .update(aiAnalysesTable)
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
            .where(eq(aiAnalysesTable.id, analysisRecord.id));
        } else {
          // Insert new analysis with upsert approach to handle race conditions
          try {
            await db.insert(aiAnalysesTable).values({
              repositoryId: repoRecord.id,
              alternatives: aiAnalysis.alternatives as Alternative[],
              category: aiAnalysis.category,
              summary: aiAnalysis.summary,
              strengths: aiAnalysis.strengths,
              considerations: aiAnalysis.considerations,
              useCase: aiAnalysis.useCase,
              targetAudience: aiAnalysis.targetAudience,
              analysisContent: `${aiAnalysis.summary}\n\nStrengths: ${aiAnalysis.strengths.join(', ')}\n\nConsiderations: ${aiAnalysis.considerations.join(', ')}\n\nUse Case: ${aiAnalysis.useCase}\n\nTarget Audience: ${aiAnalysis.targetAudience}`,
            });
          } catch (insertError: unknown) {
            // If insertion fails due to unique constraint, update the existing record
            if (
              insertError &&
              typeof insertError === 'object' &&
              'code' in insertError &&
              insertError.code === '23505'
            ) {
              console.log(`Analysis for ${fullName} exists, updating it`);
              const existingAnalysis = await db.query.aiAnalyses.findFirst({
                where: eq(aiAnalysesTable.repositoryId, repoRecord.id),
              });
              if (existingAnalysis) {
                await db
                  .update(aiAnalysesTable)
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
                  .where(eq(aiAnalysesTable.id, existingAnalysis.id));
              }
            } else {
              throw insertError;
            }
          }
        }

        // Fetch the final analysis record
        analysisRecord = await db.query.aiAnalyses.findFirst({
          where: eq(aiAnalysesTable.repositoryId, repoRecord.id),
        });
      } catch (aiError) {
        console.error('AI analysis failed:', aiError);
        // Create a fallback analysis
        const fallbackAnalysis = {
          alternatives: [
            {
              name: 'Search GitHub',
              url: `https://github.com/search?q=${encodeURIComponent(`${repoRecord.primaryLanguage || ''} ${repoRecord.description || repoRecord.name}`)}`,
              description: 'Search for similar projects on GitHub',
              reasoning: 'Manual search for alternatives',
            },
          ],
          category: repoRecord.primaryLanguage || 'Software',
          analysisContent: `Analysis for ${repoRecord.name}: ${repoRecord.description || 'No description available.'}`,
        };

        if (analysisRecord) {
          await db
            .update(aiAnalysesTable)
            .set(fallbackAnalysis)
            .where(eq(aiAnalysesTable.id, analysisRecord.id));
        } else {
          try {
            await db.insert(aiAnalysesTable).values({
              repositoryId: repoRecord.id,
              ...fallbackAnalysis,
            });
          } catch (fallbackInsertError: unknown) {
            // Handle race condition even in fallback scenario
            if (
              fallbackInsertError &&
              typeof fallbackInsertError === 'object' &&
              'code' in fallbackInsertError &&
              fallbackInsertError.code === '23505'
            ) {
              console.log(
                `Fallback analysis for ${fullName} was inserted by concurrent request`,
              );
              const existingFallback = await db.query.aiAnalyses.findFirst({
                where: eq(aiAnalysesTable.repositoryId, repoRecord.id),
              });
              if (existingFallback) {
                await db
                  .update(aiAnalysesTable)
                  .set(fallbackAnalysis)
                  .where(eq(aiAnalysesTable.id, existingFallback.id));
              }
            } else {
              console.error(
                'Failed to insert fallback analysis:',
                fallbackInsertError,
              );
            }
          }
        }

        analysisRecord = await db.query.aiAnalyses.findFirst({
          where: eq(aiAnalysesTable.repositoryId, repoRecord.id),
        });
      }
    }

    return { repoData: repoRecord, analysisData: analysisRecord };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(
      'Unknown error occurred while fetching and analyzing repository',
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const owner = searchParams.get('owner');
  const repo = searchParams.get('repo');
  const forceRefresh = searchParams.get('forceRefresh') === 'true';

  if (!owner || !repo) {
    return NextResponse.json(
      {
        message: 'Parameters owner and repo are required',
      },
      { status: 400 },
    );
  }

  try {
    const data = await fetchAndAnalyze(owner, repo, forceRefresh);

    if (!data.repoData) {
      return NextResponse.json(
        {
          message: 'Repository not found',
        },
        { status: 404 },
      );
    }

    // Return structured response
    return NextResponse.json({
      repository: data.repoData,
      analysis: data.analysisData,
      success: true,
    });
  } catch (error) {
    console.error('Error in API analyze-repo:', error); // Handle specific GitHub API errors
    if (error instanceof Error) {
      if (
        error.message.includes('authentication failed') ||
        error.message.includes('Unauthorized')
      ) {
        return NextResponse.json(
          {
            message:
              'GitHub API authentication failed. Please check your GITHUB_TOKEN environment variable.',
            error: 'GITHUB_AUTH_ERROR',
            details: error.message,
          },
          { status: 401 },
        );
      }

      if (error.message.includes('not found')) {
        return NextResponse.json(
          {
            message: 'Repository not found on GitHub',
            error: error.message,
          },
          { status: 404 },
        );
      }

      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          {
            message: 'GitHub API rate limit exceeded. Please try again later.',
            error: error.message,
          },
          { status: 429 },
        );
      }

      return NextResponse.json(
        {
          message: 'Error analyzing repository',
          error: error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        message: 'Internal server error',
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { owner, repo, forceRefresh = false } = body;

    if (!owner || !repo) {
      return NextResponse.json(
        { error: 'Owner and repo parameters are required' },
        { status: 400 },
      );
    }

    const data = await fetchAndAnalyze(owner, repo, forceRefresh);

    if (!data.repoData) {
      return NextResponse.json(
        {
          error: 'Repository not found',
          success: false,
        },
        { status: 404 },
      );
    }

    // Return structured response matching client expectations
    return NextResponse.json({
      repository: data.repoData,
      analysis: data.analysisData,
      success: true,
    });
  } catch (error) {
    console.error('Error in POST /api/analyze-repo:', error);

    // Extract body data if possible for error messages
    let owner = '';
    let repo = '';
    try {
      const body = await request.clone().json();
      owner = body.owner || '';
      repo = body.repo || '';
    } catch (parseError) {
      console.error(
        'Failed to parse request body for error context:',
        parseError,
      );
    }

    // Check if this is a race condition error during concurrent requests
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === '23505'
    ) {
      // This is likely a concurrent request scenario - return analysis in progress status
      return NextResponse.json(
        {
          error: 'ANALYSIS_IN_PROGRESS',
          success: false,
          message:
            'Repository analysis is currently in progress. Please wait a moment and refresh.',
        },
        { status: 202 },
      ); // 202 Accepted - request is being processed
    } // Check for GitHub API errors
    if (error instanceof Error) {
      if (
        error.message.includes('authentication failed') ||
        error.message.includes('Unauthorized')
      ) {
        return NextResponse.json(
          {
            error:
              'GitHub API authentication failed. Please check your GITHUB_TOKEN environment variable.',
            success: false,
            errorType: 'GITHUB_AUTH_ERROR',
            details: error.message,
          },
          { status: 401 },
        );
      }

      if (error.message.includes('rate limit exceeded')) {
        return NextResponse.json(
          {
            error: 'GitHub API rate limit exceeded. Please try again later.',
            success: false,
          },
          { status: 429 },
        );
      }

      if (
        error.message.includes('not found') ||
        error.message.includes('404')
      ) {
        return NextResponse.json(
          {
            error: `Repository ${owner}/${repo} not found on GitHub`,
            success: false,
          },
          { status: 404 },
        );
      }

      // Log detailed error for debugging
      console.error('Detailed API error:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        owner,
        repo,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        success: false,
      },
      { status: 500 },
    );
  }
}
