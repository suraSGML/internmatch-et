-- ============================================================
-- Migration 005: Applications, Interviews, Offers
-- applications, application_answers, application_events,
-- application_notes, interviews, offers
-- ============================================================

-- ------------------------------------------------------------
-- applications
-- ------------------------------------------------------------
CREATE TABLE applications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  internship_id   UUID NOT NULL REFERENCES internships(id) ON DELETE CASCADE,
  student_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cover_note      TEXT,
  cv_url          TEXT,                   -- CV snapshot at time of application
  match_score     SMALLINT CHECK (match_score BETWEEN 0 AND 100),
  status          application_status NOT NULL DEFAULT 'submitted',
  -- Internal company tags e.g. ['promising','shortlisted']
  tags            JSONB NOT NULL DEFAULT '[]',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate applications
  UNIQUE (internship_id, student_id)
);

CREATE INDEX idx_applications_internship ON applications(internship_id);
CREATE INDEX idx_applications_student ON applications(student_id);
CREATE INDEX idx_applications_status ON applications(status);

CREATE TRIGGER trg_applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ------------------------------------------------------------
-- application_answers: responses to screening questions
-- ------------------------------------------------------------
CREATE TABLE application_answers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  question_id     UUID NOT NULL REFERENCES internship_questions(id) ON DELETE CASCADE,
  answer          TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (application_id, question_id)
);

CREATE INDEX idx_application_answers_app ON application_answers(application_id);

-- ------------------------------------------------------------
-- application_events: full status history log
-- ------------------------------------------------------------
CREATE TABLE application_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  from_status     application_status,
  to_status       application_status NOT NULL,
  actor_id        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_application_events_app ON application_events(application_id);

-- ------------------------------------------------------------
-- Trigger: record status change event automatically
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION record_application_event()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO application_events (application_id, from_status, to_status)
    VALUES (NEW.id, OLD.status, NEW.status);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_application_status_event
  AFTER UPDATE OF status ON applications
  FOR EACH ROW EXECUTE FUNCTION record_application_event();

-- ------------------------------------------------------------
-- application_notes: internal company notes on an application
-- ------------------------------------------------------------
CREATE TABLE application_notes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  author_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body            TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_application_notes_app ON application_notes(application_id);

-- ------------------------------------------------------------
-- interviews
-- ------------------------------------------------------------
CREATE TABLE interviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  scheduled_at    TIMESTAMPTZ NOT NULL,
  mode            interview_mode NOT NULL DEFAULT 'in_person',
  location_or_link TEXT,
  notes           TEXT,
  status          interview_status NOT NULL DEFAULT 'scheduled',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_interviews_application ON interviews(application_id);

CREATE TRIGGER trg_interviews_updated_at
  BEFORE UPDATE ON interviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ------------------------------------------------------------
-- offers
-- ------------------------------------------------------------
CREATE TABLE offers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  start_date      DATE NOT NULL,
  end_date        DATE,
  terms           TEXT,
  status          offer_status NOT NULL DEFAULT 'pending',
  responded_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_offers_application ON offers(application_id);

CREATE TRIGGER trg_offers_updated_at
  BEFORE UPDATE ON offers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ------------------------------------------------------------
-- Trigger: when an offer is accepted → increment filled_slots
-- and update application status (transactional, prevents over-allocation)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_offer_accepted()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_app        applications%ROWTYPE;
  v_internship internships%ROWTYPE;
BEGIN
  -- Only fire when status changes TO 'accepted'
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    SELECT * INTO v_app FROM applications WHERE id = NEW.application_id FOR UPDATE;
    SELECT * INTO v_internship FROM internships WHERE id = v_app.internship_id FOR UPDATE;

    -- Check slot availability
    IF v_internship.filled_slots >= v_internship.slots THEN
      RAISE EXCEPTION 'No slots available for internship %', v_internship.id
        USING ERRCODE = 'P0001';
    END IF;

    -- Increment filled_slots
    UPDATE internships
    SET filled_slots = filled_slots + 1,
        status = CASE
          WHEN filled_slots + 1 >= slots THEN 'filled'::internship_status
          ELSE status
        END
    WHERE id = v_internship.id;

    -- Update application status to accepted
    UPDATE applications
    SET status = 'accepted'
    WHERE id = NEW.application_id AND status != 'accepted';

    -- Set responded_at
    NEW.responded_at := NOW();
  END IF;

  -- When offer is declined, update application status
  IF NEW.status = 'declined' AND OLD.status != 'declined' THEN
    UPDATE applications
    SET status = 'declined'
    WHERE id = NEW.application_id;
    NEW.responded_at := NOW();
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_offer_accepted
  BEFORE UPDATE OF status ON offers
  FOR EACH ROW EXECUTE FUNCTION handle_offer_accepted();
