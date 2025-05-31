import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Only allow this in development or with a specific debug key
    const debugKey = process.env.DEBUG_KEY;
    const isDev = process.env.NODE_ENV === 'development';

    if (!isDev && !debugKey) {
      return NextResponse.json(
        { error: 'Debug endpoint not available' },
        { status: 403 },
      );
    }

    const envInfo = {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL_URL: process.env.VERCEL_URL,
      VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
      hasGitHubToken: !!process.env.GITHUB_TOKEN,
      gitHubTokenLength: process.env.GITHUB_TOKEN?.length || 0,
      gitHubTokenPrefix: process.env.GITHUB_TOKEN?.substring(0, 4) || 'N/A',
      gitHubTokenSuffix:
        process.env.GITHUB_TOKEN?.substring(
          process.env.GITHUB_TOKEN.length - 4,
        ) || 'N/A',
      allGitHubEnvKeys: Object.keys(process.env).filter((key) =>
        key.toLowerCase().includes('github'),
      ),
      timestamp: new Date().toISOString(),
    };

    console.log('Environment debug info:', envInfo);

    return NextResponse.json({
      success: true,
      environment: envInfo,
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
