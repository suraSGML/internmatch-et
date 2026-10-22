-- ============================================================
-- Migration 001: Enums
-- All application-wide enum types used across tables.
-- ============================================================

-- User roles
CREATE TYPE user_role AS ENUM ('student', 'company', 'university', 'admin');

-- Verification / account status for companies and universities
CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'rejected', 'suspended');

-- Company member roles
CREATE TYPE company_member_role AS ENUM ('owner', 'recruiter', 'supervisor');

-- University member roles
CREATE TYPE university_member_role AS ENUM ('coordinator', 'admin');

-- Internship status lifecycle
CREATE TYPE internship_status AS ENUM ('draft', 'open', 'closed', 'filled', 'cancelled');

-- Work mode
CREATE TYPE work_mode AS ENUM ('on_site', 'remote', 'hybrid');

-- Application status lifecycle
CREATE TYPE application_status AS ENUM (
  'submitted',
  'under_review',
  'shortlisted',
  'interview_scheduled',
  'offered',
  'accepted',
  'declined',
  'rejected',
  'withdrawn'
);

-- Interview mode
CREATE TYPE interview_mode AS ENUM ('in_person', 'online', 'phone');

-- Interview status
CREATE TYPE interview_status AS ENUM ('scheduled', 'completed', 'cancelled', 'rescheduled');

-- Offer status
CREATE TYPE offer_status AS ENUM ('pending', 'accepted', 'declined', 'expired');

-- Placement status
CREATE TYPE placement_status AS ENUM (
  'pending_approval',
  'approved',
  'active',
  'completed',
  'terminated',
  'rejected'
);

-- Logbook entry status
CREATE TYPE logbook_status AS ENUM ('draft', 'submitted', 'approved', 'needs_revision');

-- Evaluation type
CREATE TYPE evaluation_type AS ENUM ('midterm', 'final');

-- Notification type
CREATE TYPE notification_type AS ENUM (
  'application_received',
  'application_status_changed',
  'interview_scheduled',
  'offer_sent',
  'offer_response',
  'placement_approved',
  'placement_rejected',
  'logbook_submitted',
  'logbook_approved',
  'logbook_needs_revision',
  'evaluation_submitted',
  'certificate_issued',
  'letter_issued',
  'announcement',
  'general'
);

-- Report reasons
CREATE TYPE report_reason AS ENUM (
  'fake_posting',
  'asking_for_money',
  'harassment',
  'discrimination',
  'other'
);

-- Report status
CREATE TYPE report_status AS ENUM ('open', 'investigating', 'resolved', 'dismissed');

-- Document type for verification
CREATE TYPE document_type AS ENUM ('registration', 'tin', 'other');
