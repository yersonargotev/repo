import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle', // Directorio para las migraciones
  dialect: 'postgresql', // Especifica que usaremos PostgreSQL
  dbCredentials: {
    url: process.env.DATABASE_URL!, // Asegúrate de tener DATABASE_URL en tus variables de entorno
  },
  verbose: true,
  strict: true,
});