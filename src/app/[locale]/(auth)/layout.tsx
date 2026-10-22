// Force dynamic rendering for all auth routes.
// Auth pages call Supabase client-side so they must not be statically prerendered.
export const dynamic = 'force-dynamic';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
