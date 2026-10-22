import { createClient } from '@/lib/supabase/server';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, XCircle, ShieldOff, ShieldCheck } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ locale: string; code: string }>;
}) {
  const { locale, code } = await params;
  const supabase = await createClient();

  // Call the public verify_document RPC (granted to anon in migrations)
  const { data: result } = await supabase
    .rpc('verify_document', { p_code: code });

  const doc = result as {
    type?: string;
    valid?: boolean;
    revoked?: boolean;
    holder_name?: string;
    organization?: string;
    role?: string;
    start_date?: string;
    end_date?: string;
    issued_at?: string;
    error?: string;
  } | null;

  const isValid = doc?.valid === true && !doc?.revoked;
  const isRevoked = doc?.revoked === true;
  const notFound = !doc || doc.error;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar locale={locale} />
      <main className="flex-1 bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="border-0 shadow-lg">
            <CardContent className="pt-8 pb-8 text-center space-y-5">
              {/* Status icon */}
              {isValid && (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <ShieldCheck className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 text-sm font-semibold px-3 py-1 rounded-full">
                    <CheckCircle2 className="h-4 w-4" />
                    Verified — Authentic Document
                  </div>
                </div>
              )}

              {isRevoked && (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <ShieldOff className="h-8 w-8 text-red-500" />
                  </div>
                  <div className="inline-flex items-center gap-1.5 bg-red-100 text-red-700 text-sm font-semibold px-3 py-1 rounded-full">
                    <XCircle className="h-4 w-4" />
                    Revoked — No Longer Valid
                  </div>
                </div>
              )}

              {notFound && !isRevoked && (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                    <XCircle className="h-8 w-8 text-gray-400" />
                  </div>
                  <div className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-600 text-sm font-semibold px-3 py-1 rounded-full">
                    <XCircle className="h-4 w-4" />
                    Not Found
                  </div>
                </div>
              )}

              {/* Verification code */}
              <div>
                <p className="text-xs text-gray-400 mb-1">Verification Code</p>
                <code className="text-sm font-mono bg-gray-100 px-3 py-1.5 rounded-lg">
                  {code}
                </code>
              </div>

              {/* Document details — only shown when valid */}
              {isValid && doc && (
                <div className="text-left bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {doc.type === 'certificate' ? '🏆 Completion Certificate' : '📋 Placement Letter'}
                    </span>
                  </div>
                  {doc.holder_name && (
                    <Row label="Holder" value={doc.holder_name} />
                  )}
                  {doc.organization && (
                    <Row label="Organization" value={doc.organization} />
                  )}
                  {doc.role && (
                    <Row label="Role" value={doc.role} />
                  )}
                  {doc.start_date && (
                    <Row
                      label="Period"
                      value={`${new Date(doc.start_date).toLocaleDateString('en-ET', { day: 'numeric', month: 'long', year: 'numeric' })}${
                        doc.end_date
                          ? ` – ${new Date(doc.end_date).toLocaleDateString('en-ET', { day: 'numeric', month: 'long', year: 'numeric' })}`
                          : ''
                      }`}
                    />
                  )}
                  {doc.issued_at && (
                    <Row
                      label="Issued"
                      value={new Date(doc.issued_at).toLocaleDateString('en-ET', { day: 'numeric', month: 'long', year: 'numeric' })}
                    />
                  )}
                </div>
              )}

              <p className="text-xs text-gray-400">
                {isValid
                  ? 'This document was issued by InternMatch ET and is authentic.'
                  : isRevoked
                  ? 'This document has been revoked by the issuing authority.'
                  : 'No document was found with this verification code.'}
              </p>

              <p className="text-xs text-gray-300">
                Powered by InternMatch ET · internmatch.et
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer locale={locale} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 text-sm">
      <span className="text-gray-500 shrink-0">{label}</span>
      <span className="font-medium text-gray-800 text-right">{value}</span>
    </div>
  );
}
