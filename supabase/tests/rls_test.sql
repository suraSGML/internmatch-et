-- ============================================================
-- rls_test.sql — Row Level Security Verification Script
-- Proves users cannot read or modify each other's data.
-- Run as a superuser (service role) after seeding.
-- Expected: all assertions pass with RAISE NOTICE 'PASS: ...'
-- ============================================================

-- Helper: run a test and report PASS/FAIL
CREATE OR REPLACE FUNCTION rls_assert(
  p_label TEXT,
  p_expected BOOLEAN,
  p_actual   BOOLEAN
) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF p_expected = p_actual THEN
    RAISE NOTICE 'PASS: %', p_label;
  ELSE
    RAISE WARNING 'FAIL: % — expected % got %', p_label, p_expected, p_actual;
  END IF;
END;
$$;

-- ────────────────────────────────────────────────────────────
-- TEST BLOCK 1: Student cannot read another student's profile
-- ────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Simulate Abebe (student 030) trying to read Sara's (031) student_profile
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000030","role":"authenticated"}';

  SELECT COUNT(*) INTO v_count
  FROM student_profiles
  WHERE user_id = 'a0000000-0000-0000-0000-000000000031'
    AND visibility = 'applied_only';

  PERFORM rls_assert(
    'Student cannot read applied_only profile of another student',
    TRUE,
    v_count = 0
  );
END;
$$;

-- ────────────────────────────────────────────────────────────
-- TEST BLOCK 2: Student cannot read another student's applications
-- ────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000030","role":"authenticated"}';

  -- Abebe tries to read Sara's application (ap003 which belongs to Sara=031)
  SELECT COUNT(*) INTO v_count
  FROM applications
  WHERE id = 'ap000000-0000-0000-0000-000000000003'
    AND student_id != 'a0000000-0000-0000-0000-000000000030';

  PERFORM rls_assert(
    'Student cannot read another student application',
    TRUE,
    v_count = 0
  );
END;
$$;

-- ────────────────────────────────────────────────────────────
-- TEST BLOCK 3: Company cannot see applications for another company's internship
-- ────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Simulate iCog owner (a010) trying to read CBE's applications (internship i002)
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000010","role":"authenticated"}';

  SELECT COUNT(*) INTO v_count
  FROM applications
  WHERE internship_id = 'i0000000-0000-0000-0000-000000000002'; -- CBE's internship

  PERFORM rls_assert(
    'Company cannot read applications for another company internship',
    TRUE,
    v_count = 0
  );
END;
$$;

-- ────────────────────────────────────────────────────────────
-- TEST BLOCK 4: Company CAN read applications for its own internship
-- ────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000010","role":"authenticated"}';

  SELECT COUNT(*) INTO v_count
  FROM applications
  WHERE internship_id = 'i0000000-0000-0000-0000-000000000001'; -- iCog's internship

  PERFORM rls_assert(
    'Company can read applications for its own internship',
    TRUE,
    v_count > 0
  );
END;
$$;

-- ────────────────────────────────────────────────────────────
-- TEST BLOCK 5: University coordinator only sees their own students
-- ────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  -- AAU coordinator (a020) should NOT see DBU student (032) profile
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000020","role":"authenticated"}';

  SELECT COUNT(*) INTO v_count
  FROM student_profiles
  WHERE user_id = 'a0000000-0000-0000-0000-000000000032'; -- Yonas from DBU

  PERFORM rls_assert(
    'AAU coordinator cannot read DBU student profile',
    TRUE,
    v_count = 0
  );
END;
$$;

-- ────────────────────────────────────────────────────────────
-- TEST BLOCK 6: Coordinator CAN see their own university's student
-- ────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000020","role":"authenticated"}';

  SELECT COUNT(*) INTO v_count
  FROM student_profiles
  WHERE user_id = 'a0000000-0000-0000-0000-000000000030'; -- Abebe from AAU

  PERFORM rls_assert(
    'AAU coordinator can read AAU student profile',
    TRUE,
    v_count = 1
  );
END;
$$;

-- ────────────────────────────────────────────────────────────
-- TEST BLOCK 7: Company cannot read CVs of non-applicants
-- ────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  -- iCog (a010) tries to read Yonas's (032) student profile
  -- Yonas never applied to iCog
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000010","role":"authenticated"}';

  SELECT COUNT(*) INTO v_count
  FROM student_profiles
  WHERE user_id = 'a0000000-0000-0000-0000-000000000032'
    AND visibility = 'applied_only';

  PERFORM rls_assert(
    'Company cannot read applied_only profile of non-applicant',
    TRUE,
    v_count = 0
  );
END;
$$;

-- ────────────────────────────────────────────────────────────
-- TEST BLOCK 8: Student cannot update another student's logbook
-- ────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_updated INTEGER;
BEGIN
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000033","role":"authenticated"}';

  -- Hana (033) tries to update Abebe's (030) logbook entry
  UPDATE logbook_entries
  SET tasks = 'HACKED'
  WHERE placement_id = 'pl000000-0000-0000-0000-000000000001';

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  PERFORM rls_assert(
    'Student cannot update another student logbook',
    TRUE,
    v_updated = 0
  );
END;
$$;

-- ────────────────────────────────────────────────────────────
-- TEST BLOCK 9: Unverified company cannot insert an internship
-- ────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_error BOOLEAN := FALSE;
BEGIN
  SET LOCAL role = 'authenticated';
  -- Use a user with no company membership at all
  SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000030","role":"authenticated"}';

  BEGIN
    INSERT INTO internships (
      company_id, title, description, deadline, slots, duration_weeks, work_mode
    ) VALUES (
      'c0000000-0000-0000-0000-000000000001',
      'Fake Internship', 'Injected by student', NOW() + INTERVAL '10 days', 1, 4, 'on_site'
    );
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN
    v_error := TRUE;
  END;

  PERFORM rls_assert(
    'Student cannot insert internship (RLS blocks non-company user)',
    TRUE,
    v_error
  );
END;
$$;

-- ────────────────────────────────────────────────────────────
-- TEST BLOCK 10: Public verification function works without auth
-- ────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_result JSONB;
BEGIN
  -- Call as anon (no JWT)
  v_result := verify_document('IM-DEMO0001');

  PERFORM rls_assert(
    'Public verify_document returns valid=true for real code',
    TRUE,
    (v_result->>'valid')::BOOLEAN = TRUE
  );

  v_result := verify_document('IM-INVALID99');
  PERFORM rls_assert(
    'Public verify_document returns valid=false for fake code',
    TRUE,
    (v_result->>'valid')::BOOLEAN = FALSE
  );
END;
$$;

-- ────────────────────────────────────────────────────────────
-- TEST BLOCK 11: Audit log cannot be updated or deleted
-- ────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_id UUID;
  v_updated INTEGER;
BEGIN
  -- Insert a test audit log entry (as superuser)
  INSERT INTO audit_logs (actor_id, action, details)
  VALUES ('a0000000-0000-0000-0000-000000000001', 'test.action', '{}')
  RETURNING id INTO v_id;

  -- Try to update it
  UPDATE audit_logs SET action = 'tampered' WHERE id = v_id;
  GET DIAGNOSTICS v_updated = ROW_COUNT;

  PERFORM rls_assert(
    'Audit log cannot be updated (append-only rule)',
    TRUE,
    v_updated = 0
  );
END;
$$;

-- ────────────────────────────────────────────────────────────
-- TEST BLOCK 12: Offer accept enforces slot limit
-- ────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_error BOOLEAN := FALSE;
BEGIN
  -- Create a 1-slot internship that is already filled
  -- and try to accept another offer — should fail
  BEGIN
    -- Manually set filled_slots = slots on a test internship
    UPDATE internships SET filled_slots = slots
    WHERE id = 'i0000000-0000-0000-0000-000000000003'; -- 2 slots, set filled to 2

    -- Now try to accept the offer for ap005 (Samuel @ Safaricom)
    UPDATE offers SET status = 'accepted'
    WHERE application_id = 'ap000000-0000-0000-0000-000000000005';

  EXCEPTION WHEN SQLSTATE 'P0001' THEN
    v_error := TRUE;
  END;

  -- Reset
  UPDATE internships SET filled_slots = 0
  WHERE id = 'i0000000-0000-0000-0000-000000000003';

  PERFORM rls_assert(
    'Offer accept blocked when no slots available',
    TRUE,
    v_error
  );
END;
$$;

RAISE NOTICE '====== RLS Test Suite Complete ======';
