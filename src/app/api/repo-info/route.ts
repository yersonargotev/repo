import { GitHubService } from '@/lib/github';
import { NextResponse, type NextRequest } from 'next/server';

const githubService = new GitHubService();

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const owner = searchParams.get('owner');
  const repo = searchParams.get('repo');

  if (!owner || !repo) {
    return NextResponse.json(
      { error: 'Owner and repo parameters are required' },
      { status: 400 },
    );
  }

  try {
    console.log(`Fetching repository info for ${owner}/${repo}`);

    // Fetch repository data
    const repoData = await githubService.fetchRepository(owner, repo);

    // Get topics
    const topics = await githubService.getRepositoryTopics(owner, repo);
    repoData.topics = topics;

    // Transform to our internal format
    const repository = {
      id: repoData.id,
      owner: repoData.owner.login,
      name: repoData.name,
      fullName: repoData.full_name,
      description: repoData.description,
      githubUrl: repoData.html_url,
      avatarUrl: repoData.owner.avatar_url,
      primaryLanguage: repoData.language,
      stars: repoData.stargazers_count,
      forks: repoData.forks_count,
      openIssues: repoData.open_issues_count,
      size: repoData.size,
      topics: repoData.topics,
      license: repoData.license?.name || null,
      isArchived: repoData.archived,
      isDisabled: repoData.disabled,
      defaultBranch: repoData.default_branch,
      githubCreatedAt: new Date(repoData.created_at),
      githubUpdatedAt: new Date(repoData.updated_at),
      githubPushedAt: new Date(repoData.pushed_at),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return NextResponse.json({
      repository,
      success: true,
    });
  } catch (error) {
    console.error(
      `Error fetching repository info for ${owner}/${repo}:`,
      error,
    );

    if (error instanceof Error) {
      if (
        error.message.includes('not found') ||
        error.message.includes('404')
      ) {
        return NextResponse.json(
          {
            error: `Repository ${owner}/${repo} not found`,
            success: false,
          },
          { status: 404 },
        );
      }

      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          {
            error: 'GitHub API rate limit exceeded. Please try again later.',
            success: false,
          },
          { status: 429 },
        );
      }

      return NextResponse.json(
        {
          error: error.message,
          success: false,
        },
        { status: 500 },
      );
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { owner, repo } = body;

    if (!owner || !repo) {
      return NextResponse.json(
        { error: 'Owner and repo parameters are required' },
        { status: 400 },
      );
    }

    console.log(`POST: Fetching repository info for ${owner}/${repo}`);

    // Fetch repository data
    const repoData = await githubService.fetchRepository(owner, repo);

    // Get topics
    const topics = await githubService.getRepositoryTopics(owner, repo);
    repoData.topics = topics;

    // Transform to our internal format
    const repository = {
      id: repoData.id,
      owner: repoData.owner.login,
      name: repoData.name,
      fullName: repoData.full_name,
      description: repoData.description,
      githubUrl: repoData.html_url,
      avatarUrl: repoData.owner.avatar_url,
      primaryLanguage: repoData.language,
      stars: repoData.stargazers_count,
      forks: repoData.forks_count,
      openIssues: repoData.open_issues_count,
      size: repoData.size,
      topics: repoData.topics,
      license: repoData.license?.name || null,
      isArchived: repoData.archived,
      isDisabled: repoData.disabled,
      defaultBranch: repoData.default_branch,
      githubCreatedAt: new Date(repoData.created_at),
      githubUpdatedAt: new Date(repoData.updated_at),
      githubPushedAt: new Date(repoData.pushed_at),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return NextResponse.json({
      repository,
      success: true,
    });
  } catch (error) {
    console.error('Error in POST /api/repo-info:', error);

    if (error instanceof Error) {
      if (
        error.message.includes('not found') ||
        error.message.includes('404')
      ) {
        return NextResponse.json(
          {
            error: `Repository not found`,
            success: false,
          },
          { status: 404 },
        );
      }

      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          {
            error: 'GitHub API rate limit exceeded. Please try again later.',
            success: false,
          },
          { status: 429 },
        );
      }

      return NextResponse.json(
        {
          error: error.message,
          success: false,
        },
        { status: 500 },
      );
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
