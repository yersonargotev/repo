import { aiAnalyses as aiAnalysesTable, repositories as repositoriesTable } from '@/db/schema';
import { db } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const owner = searchParams.get('owner');
    const repo = searchParams.get('repo');

    if (!owner || !repo) {
      return NextResponse.json(
        { error: 'Owner and repo parameters are required' },
        { status: 400 }
      );
    }

    const fullName = `${owner}/${repo}`;

    // Check if repository exists
    const repoRecord = await db.query.repositories.findFirst({
      where: eq(repositoriesTable.fullName, fullName),
    });

    if (!repoRecord) {
      return NextResponse.json({
        exists: false,
        hasAnalysis: false,
        isAnalyzing: false,
      });
    }

    // Check if analysis exists
    const analysisRecord = await db.query.aiAnalyses.findFirst({
      where: eq(aiAnalysesTable.repositoryId, repoRecord.id),
    });

    return NextResponse.json({
      exists: true,
      hasAnalysis: !!analysisRecord,
      isAnalyzing: !analysisRecord, // If repo exists but no analysis, it's likely being analyzed
      repositoryId: repoRecord.id,
      analysisId: analysisRecord?.id,
    });

  } catch (error) {
    console.error('Error checking analysis status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
