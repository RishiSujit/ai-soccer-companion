CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  kickoff_time TIMESTAMP WITH TIME ZONE NOT NULL,
  stage TEXT CHECK (stage IN ('group', 'round_of_16', 'quarterfinal', 'semifinal', 'final')) NOT NULL,
  group_name TEXT,
  status TEXT CHECK (status IN ('scheduled', 'live', 'finished')) DEFAULT 'scheduled',
  home_score INTEGER,
  away_score INTEGER,
  result TEXT CHECK (result IN ('home', 'away', 'draw'))
);
