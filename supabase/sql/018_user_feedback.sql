-- User-submitted product feedback (profile → admin triage).

CREATE TYPE feedback_category AS ENUM ('BUG', 'FEATURE', 'UX', 'GENERAL', 'OTHER');
CREATE TYPE feedback_status AS ENUM ('OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED');

CREATE TABLE user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  category feedback_category NOT NULL,
  subject VARCHAR(120) NOT NULL,
  message TEXT NOT NULL,
  page_url TEXT,
  status feedback_status NOT NULL DEFAULT 'OPEN',
  assigned_admin_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  admin_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_feedback_status_created
  ON user_feedback (status, created_at DESC);

CREATE INDEX idx_user_feedback_user_id
  ON user_feedback (user_id, created_at DESC);

CREATE INDEX idx_user_feedback_category
  ON user_feedback (category);
