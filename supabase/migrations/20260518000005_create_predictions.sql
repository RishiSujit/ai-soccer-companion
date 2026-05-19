CREATE TABLE predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  match_id UUID REFERENCES matches(id),
  result_prediction TEXT CHECK (result_prediction IN ('home', 'away', 'draw')),
  prop_predictions JSONB,
  locked_at TIMESTAMP WITH TIME ZONE,
  points_earned INTEGER DEFAULT 0,
  UNIQUE(user_id, match_id)
);
