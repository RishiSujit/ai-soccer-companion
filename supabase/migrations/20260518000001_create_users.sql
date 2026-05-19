CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  auth_type TEXT CHECK (auth_type IN ('anonymous', 'authenticated')) DEFAULT 'anonymous',
  email TEXT,
  assigned_team TEXT,
  onboarding_complete BOOLEAN DEFAULT FALSE,
  onboarding_answers JSONB
);
