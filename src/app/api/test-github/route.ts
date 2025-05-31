import { GitHubService } from '@/lib/github';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('Testing GitHub API connection...');

    const githubService = new GitHubService();

    // Test 1: Rate limit check (basic authentication test)
    const rateLimitStatus = await githubService.getRateLimitStatus();

    // Test 2: Try to fetch a public repository to test actual API access
    let repoTestResult = null;
    try {
      const testRepo = await githubService.fetchRepository('facebook', 'react');
      repoTestResult = {
        success: true,
        repoName: testRepo.name,
        stars: testRepo.stargazers_count,
      };
    } catch (repoError) {
      repoTestResult = {
        success: false,
        error: repoError instanceof Error ? repoError.message : 'Unknown error',
      };
    }

    console.log('GitHub API test results:', {
      rateLimit: rateLimitStatus,
      repoTest: repoTestResult,
    });

    return NextResponse.json({
      success: true,
      message: 'GitHub API is working correctly',
      rateLimit: rateLimitStatus,
      repoTest: repoTestResult,
      hasToken: !!process.env.GITHUB_TOKEN,
      tokenLength: process.env.GITHUB_TOKEN?.length || 0,
      tokenFormat: process.env.GITHUB_TOKEN?.substring(0, 4) || 'N/A',
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL_ENV: process.env.VERCEL_ENV,
      },
    });
  } catch (error) {
    console.error('GitHub API test failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        hasToken: !!process.env.GITHUB_TOKEN,
        tokenLength: process.env.GITHUB_TOKEN?.length || 0,
        tokenFormat: process.env.GITHUB_TOKEN?.substring(0, 4) || 'N/A',
        environment: {
          NODE_ENV: process.env.NODE_ENV,
          VERCEL_ENV: process.env.VERCEL_ENV,
        },
      },
      { status: 500 },
    );
  }
}
