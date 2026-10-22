// ─── User Roles ──────────────────────────────────────────────────────────────
export type UserRole = 'student' | 'company' | 'university' | 'admin';

// ─── Application Status ───────────────────────────────────────────────────────
// Represents every stage of a student's internship application lifecycle.
export type ApplicationStatus =
  | 'submitted'
  | 'under_review'
  | 'shortlisted'
  | 'interview_scheduled'
  | 'offered'
  | 'accepted'
  | 'declined'
  | 'rejected'
  | 'withdrawn';

// ─── Placement Status ─────────────────────────────────────────────────────────
export type PlacementStatus =
  | 'pending_approval'
  | 'approved'
  | 'active'
  | 'completed'
  | 'terminated'
  | 'rejected';

// ─── Logbook Status ───────────────────────────────────────────────────────────
export type LogbookStatus = 'draft' | 'submitted' | 'approved' | 'needs_revision';

// ─── Company / University Verification ───────────────────────────────────────
export type VerificationStatus = 'pending' | 'verified' | 'rejected' | 'suspended';

// ─── Internship Status ────────────────────────────────────────────────────────
export type InternshipStatus = 'draft' | 'open' | 'closed' | 'filled' | 'cancelled';

// ─── Work Mode ────────────────────────────────────────────────────────────────
export type WorkMode = 'on_site' | 'remote' | 'hybrid';

// ─── Evaluation Type ─────────────────────────────────────────────────────────
export type EvaluationType = 'midterm' | 'final';

// ─── Interview Mode ───────────────────────────────────────────────────────────
export type InterviewMode = 'in_person' | 'online' | 'phone';

// ─── Offer Status ────────────────────────────────────────────────────────────
export type OfferStatus = 'pending' | 'accepted' | 'declined' | 'expired';

// ─── Nav Item (used by DashboardLayout) ──────────────────────────────────────
export interface NavItem {
  label: string;
  href: string;
  icon: string; // lucide icon name
}

// ─── Match Score Result ───────────────────────────────────────────────────────
// Returned by the matching algorithm (Phase 5)
export interface MatchScoreResult {
  total: number; // 0–100
  breakdown: {
    skills: number;
    field: number;
    location: number;
    availability: number;
    education: number;
  };
  explanation: string[]; // e.g. ["Matches 4 of 6 required skills"]
}
