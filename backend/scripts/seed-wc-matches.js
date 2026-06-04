require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Columns mapped to actual matches schema:
//   id            UUID (auto)
//   home_team     TEXT NOT NULL
//   away_team     TEXT NOT NULL
//   kickoff_time  TIMESTAMP WITH TIME ZONE NOT NULL
//   stage         TEXT CHECK (group|round_of_16|quarterfinal|semifinal|final)
//   group_name    TEXT
//   status        TEXT CHECK (scheduled|live|finished)
//   home_score    INTEGER
//   away_score    INTEGER
//   result        TEXT
// Extra columns added via ALTER TABLE (printed below if missing):
//   fixture_id, home_flag, away_flag, kickoff_et, venue, city, tv_us, is_featured

const MATCHES = [
  {
    fixture_id: 'wc-a1', home_team: 'Mexico', away_team: 'South Africa',
    home_flag: '🇲🇽', away_flag: '🇿🇦',
    kickoff_time: '2026-06-11T19:00:00Z', kickoff_et: '3:00 PM ET',
    stage: 'group', group_name: 'Group A', status: 'scheduled',
    venue: 'Estadio Azteca', city: 'Mexico City', tv_us: 'FOX',
  },
  {
    fixture_id: 'wc-a2', home_team: 'South Korea', away_team: 'Czechia',
    home_flag: '🇰🇷', away_flag: '🇨🇿',
    kickoff_time: '2026-06-12T02:00:00Z', kickoff_et: '10:00 PM ET',
    stage: 'group', group_name: 'Group A', status: 'scheduled',
    venue: 'Estadio Akron', city: 'Guadalajara', tv_us: 'FS1',
  },
  {
    fixture_id: 'wc-b1', home_team: 'Canada', away_team: 'Bosnia & Herzegovina',
    home_flag: '🇨🇦', away_flag: '🇧🇦',
    kickoff_time: '2026-06-12T19:00:00Z', kickoff_et: '3:00 PM ET',
    stage: 'group', group_name: 'Group B', status: 'scheduled',
    venue: 'BMO Field', city: 'Toronto', tv_us: 'FS1',
  },
  {
    fixture_id: 'wc-d1', home_team: 'USA', away_team: 'Paraguay',
    home_flag: '🇺🇸', away_flag: '🇵🇾',
    kickoff_time: '2026-06-13T01:00:00Z', kickoff_et: '9:00 PM ET',
    stage: 'group', group_name: 'Group D', status: 'scheduled',
    venue: 'SoFi Stadium', city: 'Los Angeles', tv_us: 'FOX', is_featured: true,
  },
  {
    fixture_id: 'wc-b2', home_team: 'Qatar', away_team: 'Switzerland',
    home_flag: '🇶🇦', away_flag: '🇨🇭',
    kickoff_time: '2026-06-13T19:00:00Z', kickoff_et: '3:00 PM ET',
    stage: 'group', group_name: 'Group B', status: 'scheduled',
    venue: "Levi's Stadium", city: 'Santa Clara, CA', tv_us: 'FS1',
  },
  {
    fixture_id: 'wc-c1', home_team: 'Brazil', away_team: 'Morocco',
    home_flag: '🇧🇷', away_flag: '🇲🇦',
    kickoff_time: '2026-06-13T22:00:00Z', kickoff_et: '6:00 PM ET',
    stage: 'group', group_name: 'Group C', status: 'scheduled',
    venue: 'MetLife Stadium', city: 'New Jersey', tv_us: 'FOX',
  },
  {
    fixture_id: 'wc-c2', home_team: 'Haiti', away_team: 'Scotland',
    home_flag: '🇭🇹', away_flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
    kickoff_time: '2026-06-14T01:00:00Z', kickoff_et: '9:00 PM ET',
    stage: 'group', group_name: 'Group C', status: 'scheduled',
    venue: 'Gillette Stadium', city: 'Boston', tv_us: 'FS1',
  },
  {
    fixture_id: 'wc-e1', home_team: 'Germany', away_team: 'Curaçao',
    home_flag: '🇩🇪', away_flag: '🇨🇼',
    kickoff_time: '2026-06-14T17:00:00Z', kickoff_et: '1:00 PM ET',
    stage: 'group', group_name: 'Group E', status: 'scheduled',
    venue: 'TBD', city: 'TBD', tv_us: 'FS1',
  },
  {
    fixture_id: 'wc-f1', home_team: 'Netherlands', away_team: 'Japan',
    home_flag: '🇳🇱', away_flag: '🇯🇵',
    kickoff_time: '2026-06-14T20:00:00Z', kickoff_et: '4:00 PM ET',
    stage: 'group', group_name: 'Group F', status: 'scheduled',
    venue: 'TBD', city: 'TBD', tv_us: 'FOX',
  },
  {
    fixture_id: 'wc-e2', home_team: 'Ivory Coast', away_team: 'Ecuador',
    home_flag: '🇨🇮', away_flag: '🇪🇨',
    kickoff_time: '2026-06-14T23:00:00Z', kickoff_et: '7:00 PM ET',
    stage: 'group', group_name: 'Group E', status: 'scheduled',
    venue: 'TBD', city: 'TBD', tv_us: 'FS1',
  },
  {
    fixture_id: 'wc-f2', home_team: 'Sweden', away_team: 'Tunisia',
    home_flag: '🇸🇪', away_flag: '🇹🇳',
    kickoff_time: '2026-06-15T02:00:00Z', kickoff_et: '10:00 PM ET',
    stage: 'group', group_name: 'Group F', status: 'scheduled',
    venue: 'TBD', city: 'TBD', tv_us: 'FS1',
  },
  {
    fixture_id: 'wc-g1', home_team: 'Spain', away_team: 'Cape Verde',
    home_flag: '🇪🇸', away_flag: '🇨🇻',
    kickoff_time: '2026-06-15T16:00:00Z', kickoff_et: '12:00 PM ET',
    stage: 'group', group_name: 'Group G', status: 'scheduled',
    venue: 'TBD', city: 'TBD', tv_us: 'FOX',
  },
  {
    fixture_id: 'wc-h1', home_team: 'Belgium', away_team: 'Egypt',
    home_flag: '🇧🇪', away_flag: '🇪🇬',
    kickoff_time: '2026-06-15T19:00:00Z', kickoff_et: '3:00 PM ET',
    stage: 'group', group_name: 'Group H', status: 'scheduled',
    venue: 'TBD', city: 'TBD', tv_us: 'FS1',
  },
  {
    fixture_id: 'wc-g2', home_team: 'Saudi Arabia', away_team: 'Uruguay',
    home_flag: '🇸🇦', away_flag: '🇺🇾',
    kickoff_time: '2026-06-15T22:00:00Z', kickoff_et: '6:00 PM ET',
    stage: 'group', group_name: 'Group G', status: 'scheduled',
    venue: 'TBD', city: 'TBD', tv_us: 'FOX',
  },
  {
    fixture_id: 'wc-h2', home_team: 'Iran', away_team: 'New Zealand',
    home_flag: '🇮🇷', away_flag: '🇳🇿',
    kickoff_time: '2026-06-16T01:00:00Z', kickoff_et: '9:00 PM ET',
    stage: 'group', group_name: 'Group H', status: 'scheduled',
    venue: 'TBD', city: 'TBD', tv_us: 'FS1',
  },
  {
    fixture_id: 'wc-i1', home_team: 'France', away_team: 'Senegal',
    home_flag: '🇫🇷', away_flag: '🇸🇳',
    kickoff_time: '2026-06-16T19:00:00Z', kickoff_et: '3:00 PM ET',
    stage: 'group', group_name: 'Group I', status: 'scheduled',
    venue: 'TBD', city: 'TBD', tv_us: 'FOX',
  },
  {
    fixture_id: 'wc-i2', home_team: 'Iraq', away_team: 'Norway',
    home_flag: '🇮🇶', away_flag: '🇳🇴',
    kickoff_time: '2026-06-16T22:00:00Z', kickoff_et: '6:00 PM ET',
    stage: 'group', group_name: 'Group I', status: 'scheduled',
    venue: 'TBD', city: 'TBD', tv_us: 'FS1',
  },
];

const ALTER_TABLE_SQL = `
-- Run this SQL in the Supabase SQL editor, then run the seed again:
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS fixture_id TEXT,
  ADD COLUMN IF NOT EXISTS home_flag  TEXT,
  ADD COLUMN IF NOT EXISTS away_flag  TEXT,
  ADD COLUMN IF NOT EXISTS kickoff_et TEXT,
  ADD COLUMN IF NOT EXISTS venue      TEXT,
  ADD COLUMN IF NOT EXISTS city       TEXT,
  ADD COLUMN IF NOT EXISTS tv_us      TEXT,
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
`.trim();

async function seedMatches() {
  console.log(`\nSeeding ${MATCHES.length} World Cup 2026 opening matches...\n`);

  // Clear existing scheduled group-stage rows
  const { error: deleteErr } = await supabase
    .from('matches')
    .delete()
    .eq('stage', 'group');

  if (deleteErr) {
    console.error('Delete error:', deleteErr.message);
    // Non-fatal — table may be empty
  } else {
    console.log('Cleared existing group-stage rows');
  }

  const { error } = await supabase.from('matches').insert(MATCHES);

  if (error) {
    console.error('\nSeed error:', error.message);
    if (error.message?.includes("column") || error.code === 'PGRST204') {
      console.log('\n⚠️  Missing columns. Run this SQL in the Supabase SQL editor:\n');
      console.log(ALTER_TABLE_SQL);
      console.log('\nThen run: node backend/scripts/seed-wc-matches.js\n');
    }
    process.exit(1);
  } else {
    console.log(`✅ Seeded ${MATCHES.length} matches\n`);
    console.log('Verifying...');
    const { data, error: verifyErr } = await supabase
      .from('matches')
      .select('fixture_id, home_team, away_team, kickoff_et, group_name')
      .eq('stage', 'group')
      .order('kickoff_time');
    if (verifyErr) {
      console.log('Verify failed (fixture_id column may not exist yet):', verifyErr.message);
    } else {
      console.log(`\nSeeded rows:\n`);
      data.forEach(m => console.log(`  ${m.group_name || '?'} · ${m.home_team} vs ${m.away_team} · ${m.kickoff_et || ''}`));
    }
  }
}

seedMatches().catch(console.error);
