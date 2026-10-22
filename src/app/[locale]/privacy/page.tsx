import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar locale={locale} />
      <main className="flex-1 bg-white">
        <div className="container mx-auto px-4 py-12 max-w-3xl prose prose-sm prose-indigo">
          <h1>Privacy Policy</h1>
          <p className="text-gray-500 text-sm">Last updated: January 2025</p>

          <h2>1. What We Collect</h2>
          <p>We collect information you provide when you register and use InternMatch ET: name, email, phone, city, university details, CV, skills, application data, logbook entries, and evaluation results.</p>

          <h2>2. How We Use It</h2>
          <ul>
            <li>To match students with relevant internships</li>
            <li>To enable companies to review applicants</li>
            <li>To allow universities to track and support student placements</li>
            <li>To generate verifiable certificates and placement letters</li>
            <li>To send important notifications about your applications and placements</li>
          </ul>

          <h2>3. Who Sees Your Data</h2>
          <p><strong>Students:</strong> Your profile is visible to verified companies (or only to companies you apply to — your choice). Logbook entries are visible to your supervisor and university coordinator. Evaluations are visible to coordinators and optionally to you.</p>
          <p><strong>Companies:</strong> Your company information and internship listings are visible to all users. Applicant data is only visible to your company members.</p>
          <p><strong>Verification data</strong> (TIN numbers, registration documents) is only visible to admins.</p>

          <h2>4. Data Storage</h2>
          <p>Your data is stored on Supabase infrastructure (PostgreSQL on AWS). Files are stored in Supabase Storage. We use Row Level Security to enforce access controls at the database level.</p>

          <h2>5. Your Rights</h2>
          <p>You may request deletion of your account and data at any time by emailing <a href="mailto:privacy@internmatch.et">privacy@internmatch.et</a>. Certificates and placement letters may be retained for verification purposes even after account deletion.</p>

          <h2>6. Cookies</h2>
          <p>We use session cookies for authentication only. No third-party tracking cookies are used.</p>

          <h2>7. Contact</h2>
          <p>Privacy questions: <a href="mailto:privacy@internmatch.et">privacy@internmatch.et</a></p>
        </div>
      </main>
      <Footer locale={locale} />
    </div>
  );
}
