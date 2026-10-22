CREATE OR REPLACE FUNCTION notify_students_of_announcement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, body, link)
  SELECT
    sp.user_id,
    'announcement',
    NEW.title,
    NEW.body,
    '/student/announcements'
  FROM student_profiles sp
  WHERE sp.university_id = NEW.university_id
    AND (NEW.department_id IS NULL OR sp.department_id = NEW.department_id);

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_students_of_announcement
  AFTER INSERT ON announcements
  FOR EACH ROW
  EXECUTE FUNCTION notify_students_of_announcement();
