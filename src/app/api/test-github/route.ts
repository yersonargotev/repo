import { GitHubService } from '@/lib/github';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('Testing GitHub API connection...');

    const githubService = new GitHubService();

    // Test with a simple rate limit check that doesn't require authentication
    // but will fail with proper error if token is invalid
    const rateLimitStatus = await githubService.getRateLimitStatus();

    console.log('GitHub API test successful:', rateLimitStatus);

    return NextResponse.json({
      success: true,
      message: 'GitHub API is working correctly',
      rateLimit: rateLimitStatus,
      hasToken: !!process.env.GITHUB_TOKEN,
      tokenLength: process.env.GITHUB_TOKEN?.length || 0,
    });
  } catch (error) {
    console.error('GitHub API test failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        hasToken: !!process.env.GITHUB_TOKEN,
        tokenLength: process.env.GITHUB_TOKEN?.length || 0,
        environment: {
          NODE_ENV: process.env.NODE_ENV,
          VERCEL_ENV: process.env.VERCEL_ENV,
        },
      },
      { status: 500 },
    );
  }
}
