import { getRepositoryInfo } from '@/lib/repository';
import { NextResponse, type NextRequest } from 'next/server';

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
    const result = await getRepositoryInfo(owner, repo);
    return NextResponse.json(result);
  } catch (error) {
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

    console.log(`POST: Getting repository info for ${owner}/${repo}`);

    const result = await getRepositoryInfo(owner, repo);
    return NextResponse.json(result);
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
