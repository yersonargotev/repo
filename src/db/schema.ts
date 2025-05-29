import {
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
  primaryLanguage: varchar('primary_language', { length: 100 }),  stars: integer('stars').default(0),
  forks: integer('forks').default(0),
  // Timestamps automáticos
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => {
  return {
    fullNameIdx: uniqueIndex("full_name_idx").on(table.fullName),
  };
});

// Tabla de análisis de IA
export const aiAnalyses = pgTable('ai_analyses', {
  id: serial('id').primaryKey(),
  repositoryId: integer('repository_id').notNull().references(() => repositories.id, { onDelete: 'cascade' }),
  // Array de objetos: { name: string, url: string, description?: string }
  alternatives: jsonb('alternatives').$type<Array<{ name: string; url: string; description?: string }>>(),
  category: varchar('category', { length: 255 }),
  analysisContent: text('analysis_content'), // Contenido generado por IA
  // Timestamps automáticos
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Repository = typeof repositories.$inferSelect;
export type NewRepository = typeof repositories.$inferInsert;
export type AiAnalysis = typeof aiAnalyses.$inferSelect;
export type NewAiAnalysis = typeof aiAnalyses.$inferInsert;
