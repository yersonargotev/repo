import { repositories } from '@/db/schema';
import { db } from '@/lib/db';
import { desc } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const repos = await db
      .select()
      .from(repositories)
      .orderBy(desc(repositories.stars), desc(repositories.updatedAt));

    return NextResponse.json({ success: true, repositories: repos });
  } catch (error) {
    console.error('Error fetching repositories:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch repositories' },
      { status: 500 }
    );
  }
}
