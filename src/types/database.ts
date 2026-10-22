/**
 * Supabase-generated database types.
 *
 * After Phase 2, run:
 *   npx supabase gen types typescript --project-id <your-project-ref> > src/types/database.ts
 *
 * This replaces this placeholder with fully-typed table definitions.
 */

// Placeholder to avoid import errors before types are generated
export type Database = Record<string, unknown>;

// Re-export a Json helper type (used in JSONB columns)
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];
