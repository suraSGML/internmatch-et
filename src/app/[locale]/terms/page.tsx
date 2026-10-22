import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar locale={locale} />
      <main className="flex-1 bg-white">
        <div className="container mx-auto px-4 py-12 max-w-3xl prose prose-sm prose-indigo">
          <h1>Terms of Service</h1>
          <p className="text-gray-500 text-sm">Last updated: January 2025</p>

          <h2>1. Acceptance</h2>
          <p>By using InternMatch ET, you agree to these Terms. If you are a student, company, or university coordinator, you must be at least 16 years old.</p>

          <h2>2. No Payment from Students</h2>
          <p><strong>Companies may never require payment from students</strong> as a condition of applying, interviewing, or accepting an internship. Any such request must be reported immediately. Violations result in immediate account suspension.</p>

          <h2>3. Accurate Information</h2>
          <p>You agree to provide accurate information. False or misleading profiles, company details, or internship listings will be removed and the account suspended.</p>

          <h2>4. Verified Companies</h2>
          <p>Only verified companies may post internships. Verification requires uploading registration documents reviewed by our team.</p>

          <h2>5. Student Privacy</h2>
          <p>Students control who can see their profiles. Companies can only see profiles of students who apply to them (if the student's visibility is set to &quot;applied only&quot;) or all verified companies (default).</p>

          <h2>6. Termination</h2>
          <p>We reserve the right to suspend or terminate accounts that violate these Terms, with or without notice.</p>

          <h2>7. Limitation of Liability</h2>
          <p>InternMatch ET is a platform that facilitates connections. We are not responsible for the conduct of users, the quality of internships, or employment outcomes.</p>

          <h2>8. Contact</h2>
          <p>Questions? Email <a href="mailto:legal@internmatch.et">legal@internmatch.et</a>.</p>
        </div>
      </main>
      <Footer locale={locale} />
    </div>
  );
}
