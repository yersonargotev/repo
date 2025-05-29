import {
    boolean,
    integer,
    jsonb,
    pgTable,
    serial,
    text,
    timestamp,
    uniqueIndex,
    varchar,
} from 'drizzle-orm/pg-core';

// Tabla principal de repositorios
export const repositories = pgTable('repositories', {
  id: serial('id').primaryKey(),
  owner: varchar('owner', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  fullName: varchar('full_name', { length: 511 }).notNull().unique(), // owner/name
  description: text('description'),
  githubUrl: varchar('github_url', { length: 2048 }).notNull(),
  avatarUrl: varchar('avatar_url', { length: 2048 }),
  primaryLanguage: varchar('primary_language', { length: 100 }),
  stars: integer('stars').default(0),
  forks: integer('forks').default(0),
  openIssues: integer('open_issues').default(0),
  size: integer('size').default(0), // Repository size in KB
  topics: jsonb('topics').$type<string[]>(), // Repository topics/tags
  license: varchar('license', { length: 255 }), // License name
  isArchived: boolean('is_archived').default(false),
  isDisabled: boolean('is_disabled').default(false),
  defaultBranch: varchar('default_branch', { length: 100 }).default('main'),
  // GitHub timestamps
  githubCreatedAt: timestamp('github_created_at'),
  githubUpdatedAt: timestamp('github_updated_at'),
  githubPushedAt: timestamp('github_pushed_at'),
  // Our timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => {
  return {
    fullNameIdx: uniqueIndex("full_name_idx").on(table.fullName),
  };
});

// Alternative tool interface
export interface Alternative {
  name: string;
  url: string;
  description?: string;
  githubUrl?: string;
  stars?: number;
  category?: string;
  reasoning: string;
}

// Tabla de análisis de IA
export const aiAnalyses = pgTable('ai_analyses', {
  id: serial('id').primaryKey(),
  repositoryId: integer('repository_id').notNull().references(() => repositories.id, { onDelete: 'cascade' }),
  // Array de objetos con información detallada de alternativas
  alternatives: jsonb('alternatives').$type<Alternative[]>(),
  category: varchar('category', { length: 255 }),
  summary: text('summary'), // Resumen del análisis
  strengths: jsonb('strengths').$type<string[]>(), // Fortalezas identificadas
  considerations: jsonb('considerations').$type<string[]>(), // Consideraciones importantes
  useCase: text('use_case'), // Casos de uso principales
  targetAudience: text('target_audience'), // Audiencia objetivo
  analysisContent: text('analysis_content'), // Contenido completo generado por IA (legacy)
  // Timestamps automáticos
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Repository = typeof repositories.$inferSelect;
export type NewRepository = typeof repositories.$inferInsert;
export type AiAnalysis = typeof aiAnalyses.$inferSelect;
export type NewAiAnalysis = typeof aiAnalyses.$inferInsert;
