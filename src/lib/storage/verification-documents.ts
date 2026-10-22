import 'server-only';

import { createServiceClient } from '@/lib/supabase/service';

function getStoragePath(filePath: string): string | null {
  if (!/^https?:\/\//i.test(filePath)) return filePath;

  try {
    const pathname = new URL(filePath).pathname;
    const match = pathname.match(
      /\/storage\/v1\/object\/(?:sign|authenticated|public)\/verification-docs\/(.+)$/
    );
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

export async function createVerificationDocumentUrl(filePath: string) {
  const storagePath = getStoragePath(filePath);
  if (!storagePath) {
    return { url: null, error: 'Document path is not a verification-docs storage path' };
  }

  const { data, error } = await createServiceClient()
    .storage.from('verification-docs')
    .createSignedUrl(storagePath, 60 * 60);

  return {
    url: data?.signedUrl ?? null,
    error: error?.message ?? null,
  };
}
