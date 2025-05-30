import { repositories } from '@/db/schema';
import { db } from '@/lib/db';
import { desc, eq, like, or } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

const PAGE_SIZE = 12; // Número de repositorios por página

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '0');
    const search = searchParams.get('search') || '';
    const language = searchParams.get('language') || '';
    const sortBy = searchParams.get('sortBy') || 'stars';

    // Construir condiciones de filtrado
    const conditions = [];
    
    if (search) {
      conditions.push(
        or(
          like(repositories.name, `%${search}%`),
          like(repositories.owner, `%${search}%`),
          like(repositories.description, `%${search}%`)
        )
      );
    }
    
    if (language && language !== 'all') {
      conditions.push(eq(repositories.primaryLanguage, language));
    }

    // Determinar el orden
    let orderByClause;
    switch (sortBy) {
      case 'forks':
        orderByClause = [desc(repositories.forks), desc(repositories.updatedAt)];
        break;
      case 'updated':
        orderByClause = [desc(repositories.githubUpdatedAt), desc(repositories.updatedAt)];
        break;
      case 'name':
        orderByClause = [repositories.name];
        break;
      case 'stars':
      default:
        orderByClause = [desc(repositories.stars), desc(repositories.updatedAt)];
        break;
    }

    // Construir query base con filtros
    const query = db
      .select()
      .from(repositories)
      .where(
        conditions.length === 0
          ? undefined
          : conditions.length === 1
          ? conditions[0]
          : or(...conditions)
      )
      .orderBy(...orderByClause)
      .limit(PAGE_SIZE)
      .offset(page * PAGE_SIZE);

    // Ejecutar la consulta
    const repos = await query;

    // Obtener el total de repositorios para saber si hay más páginas
    let totalQuery;
    if (conditions.length > 0) {
      totalQuery = db
        .select({ count: repositories.id })
        .from(repositories)
        .where(conditions.length === 1 ? conditions[0] : or(...conditions));
    } else {
      totalQuery = db
        .select({ count: repositories.id })
        .from(repositories);
    }
    
    const totalResult = await totalQuery;
    const total = totalResult.length > 0 ? totalResult.length : 0;
    const hasNextPage = (page + 1) * PAGE_SIZE < total;

    return NextResponse.json({ 
      success: true, 
      repositories: repos,
      hasNextPage,
      nextPage: hasNextPage ? page + 1 : null,
      total,
      page,
      pageSize: PAGE_SIZE
    });
  } catch (error) {
    console.error('Error fetching repositories:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch repositories' },
      { status: 500 }
    );
  }
}
