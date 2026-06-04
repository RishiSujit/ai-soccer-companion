// ─────────────────────────────────────
// 2026 FIFA WORLD CUP — Official Data
// All times Eastern (ET)
// Tournament: June 11 – July 19, 2026
// ─────────────────────────────────────

export const TOURNAMENT = {
  name: 'FIFA World Cup 2026',
  startDate: '2026-06-11',
  endDate: '2026-07-19',
  teams: 48,
  matches: 104,
  final: 'MetLife Stadium, New Jersey',
  finalDate: '2026-07-19',
  hosts: ['USA', 'Canada', 'Mexico'],
};

export const GROUPS = {
  A: {
    name: 'Group A',
    teams: [
      { name: 'Mexico',       flag: '🇲🇽', code: 'MEX', isHost: true },
      { name: 'South Korea',  flag: '🇰🇷', code: 'KOR' },
      { name: 'Czechia',      flag: '🇨🇿', code: 'CZE' },
      { name: 'South Africa', flag: '🇿🇦', code: 'RSA' },
    ],
  },
  B: {
    name: 'Group B',
    teams: [
      { name: 'Canada',               flag: '🇨🇦', code: 'CAN', isHost: true },
      { name: 'Qatar',                flag: '🇶🇦', code: 'QAT' },
      { name: 'Switzerland',          flag: '🇨🇭', code: 'SUI' },
      { name: 'Bosnia & Herzegovina', flag: '🇧🇦', code: 'BIH' },
    ],
  },
  C: {
    name: 'Group C',
    teams: [
      { name: 'Brazil',   flag: '🇧🇷', code: 'BRA' },
      { name: 'Morocco',  flag: '🇲🇦', code: 'MAR' },
      { name: 'Haiti',    flag: '🇭🇹', code: 'HAI' },
      { name: 'Scotland', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', code: 'SCO' },
    ],
  },
  D: {
    name: 'Group D',
    teams: [
      { name: 'USA',       flag: '🇺🇸', code: 'USA', isHost: true },
      { name: 'Paraguay',  flag: '🇵🇾', code: 'PAR' },
      { name: 'Australia', flag: '🇦🇺', code: 'AUS' },
      { name: 'Türkiye',   flag: '🇹🇷', code: 'TUR' },
    ],
  },
  E: {
    name: 'Group E',
    teams: [
      { name: 'Germany',     flag: '🇩🇪', code: 'GER' },
      { name: 'Ivory Coast', flag: '🇨🇮', code: 'CIV' },
      { name: 'Ecuador',     flag: '🇪🇨', code: 'ECU' },
      { name: 'Curaçao',     flag: '🇨🇼', code: 'CUW' },
    ],
  },
  F: {
    name: 'Group F',
    teams: [
      { name: 'Netherlands', flag: '🇳🇱', code: 'NED' },
      { name: 'Japan',       flag: '🇯🇵', code: 'JPN' },
      { name: 'Sweden',      flag: '🇸🇪', code: 'SWE' },
      { name: 'Tunisia',     flag: '🇹🇳', code: 'TUN' },
    ],
  },
  G: {
    name: 'Group G',
    teams: [
      { name: 'Spain',        flag: '🇪🇸', code: 'ESP' },
      { name: 'Saudi Arabia', flag: '🇸🇦', code: 'KSA' },
      { name: 'Uruguay',      flag: '🇺🇾', code: 'URU' },
      { name: 'Cape Verde',   flag: '🇨🇻', code: 'CPV' },
    ],
  },
  H: {
    name: 'Group H',
    teams: [
      { name: 'Belgium',     flag: '🇧🇪', code: 'BEL' },
      { name: 'Egypt',       flag: '🇪🇬', code: 'EGY' },
      { name: 'Iran',        flag: '🇮🇷', code: 'IRN' },
      { name: 'New Zealand', flag: '🇳🇿', code: 'NZL' },
    ],
  },
  I: {
    name: 'Group I',
    teams: [
      { name: 'France',  flag: '🇫🇷', code: 'FRA' },
      { name: 'Senegal', flag: '🇸🇳', code: 'SEN' },
      { name: 'Iraq',    flag: '🇮🇶', code: 'IRQ' },
      { name: 'Norway',  flag: '🇳🇴', code: 'NOR' },
    ],
  },
  J: {
    name: 'Group J',
    teams: [
      { name: 'Argentina',   flag: '🇦🇷', code: 'ARG' },
      { name: 'South Africa', flag: '🇿🇦', code: 'RSA' },
      { name: 'TBD',         flag: '🏳️', code: 'TBD' },
      { name: 'TBD',         flag: '🏳️', code: 'TBD' },
    ],
  },
  K: {
    name: 'Group K',
    teams: [
      { name: 'Portugal', flag: '🇵🇹', code: 'POR' },
      { name: 'TBD',      flag: '🏳️', code: 'TBD' },
      { name: 'TBD',      flag: '🏳️', code: 'TBD' },
      { name: 'TBD',      flag: '🏳️', code: 'TBD' },
    ],
  },
  L: {
    name: 'Group L',
    teams: [
      { name: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', code: 'ENG' },
      { name: 'Croatia', flag: '🇭🇷', code: 'CRO' },
      { name: 'Ghana',   flag: '🇬🇭', code: 'GHA' },
      { name: 'Panama',  flag: '🇵🇦', code: 'PAN' },
    ],
  },
};

// All opening matches — first week. All times ET.
export const OPENING_MATCHES = [
  // June 11
  {
    id: 'wc-a1',
    date: '2026-06-11',
    kickoffET: '3:00 PM ET',
    kickoffISO: '2026-06-11T19:00:00Z',
    group: 'A',
    homeTeam: 'Mexico',
    awayTeam: 'South Africa',
    homeFlag: '🇲🇽',
    awayFlag: '🇿🇦',
    venue: 'Estadio Azteca',
    city: 'Mexico City',
    tvUS: 'FOX',
  },
  {
    id: 'wc-a2',
    date: '2026-06-11',
    kickoffET: '10:00 PM ET',
    kickoffISO: '2026-06-12T02:00:00Z',
    group: 'A',
    homeTeam: 'South Korea',
    awayTeam: 'Czechia',
    homeFlag: '🇰🇷',
    awayFlag: '🇨🇿',
    venue: 'Estadio Akron',
    city: 'Guadalajara',
    tvUS: 'FS1',
  },
  // June 12
  {
    id: 'wc-b1',
    date: '2026-06-12',
    kickoffET: '3:00 PM ET',
    kickoffISO: '2026-06-12T19:00:00Z',
    group: 'B',
    homeTeam: 'Canada',
    awayTeam: 'Bosnia & Herzegovina',
    homeFlag: '🇨🇦',
    awayFlag: '🇧🇦',
    venue: 'BMO Field',
    city: 'Toronto',
    tvUS: 'FS1',
  },
  {
    id: 'wc-d1',
    date: '2026-06-12',
    kickoffET: '9:00 PM ET',
    kickoffISO: '2026-06-13T01:00:00Z',
    group: 'D',
    homeTeam: 'USA',
    awayTeam: 'Paraguay',
    homeFlag: '🇺🇸',
    awayFlag: '🇵🇾',
    venue: 'SoFi Stadium',
    city: 'Los Angeles',
    tvUS: 'FOX',
    isUSAGame: true,
  },
  // June 13
  {
    id: 'wc-b2',
    date: '2026-06-13',
    kickoffET: '3:00 PM ET',
    kickoffISO: '2026-06-13T19:00:00Z',
    group: 'B',
    homeTeam: 'Qatar',
    awayTeam: 'Switzerland',
    homeFlag: '🇶🇦',
    awayFlag: '🇨🇭',
    venue: "Levi's Stadium",
    city: 'Santa Clara, CA',
    tvUS: 'FS1',
  },
  {
    id: 'wc-c1',
    date: '2026-06-13',
    kickoffET: '6:00 PM ET',
    kickoffISO: '2026-06-13T22:00:00Z',
    group: 'C',
    homeTeam: 'Brazil',
    awayTeam: 'Morocco',
    homeFlag: '🇧🇷',
    awayFlag: '🇲🇦',
    venue: 'MetLife Stadium',
    city: 'New Jersey',
    tvUS: 'FOX',
  },
  {
    id: 'wc-c2',
    date: '2026-06-13',
    kickoffET: '9:00 PM ET',
    kickoffISO: '2026-06-14T01:00:00Z',
    group: 'C',
    homeTeam: 'Haiti',
    awayTeam: 'Scotland',
    homeFlag: '🇭🇹',
    awayFlag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
    venue: 'Gillette Stadium',
    city: 'Boston',
    tvUS: 'FS1',
  },
  // June 14
  {
    id: 'wc-e1',
    date: '2026-06-14',
    kickoffET: '1:00 PM ET',
    kickoffISO: '2026-06-14T17:00:00Z',
    group: 'E',
    homeTeam: 'Germany',
    awayTeam: 'Curaçao',
    homeFlag: '🇩🇪',
    awayFlag: '🇨🇼',
    venue: 'TBD',
    city: 'TBD',
    tvUS: 'FS1',
  },
  {
    id: 'wc-f1',
    date: '2026-06-14',
    kickoffET: '4:00 PM ET',
    kickoffISO: '2026-06-14T20:00:00Z',
    group: 'F',
    homeTeam: 'Netherlands',
    awayTeam: 'Japan',
    homeFlag: '🇳🇱',
    awayFlag: '🇯🇵',
    venue: 'TBD',
    city: 'TBD',
    tvUS: 'FOX',
  },
  {
    id: 'wc-e2',
    date: '2026-06-14',
    kickoffET: '7:00 PM ET',
    kickoffISO: '2026-06-14T23:00:00Z',
    group: 'E',
    homeTeam: 'Ivory Coast',
    awayTeam: 'Ecuador',
    homeFlag: '🇨🇮',
    awayFlag: '🇪🇨',
    venue: 'TBD',
    city: 'TBD',
    tvUS: 'FS1',
  },
  {
    id: 'wc-f2',
    date: '2026-06-14',
    kickoffET: '10:00 PM ET',
    kickoffISO: '2026-06-15T02:00:00Z',
    group: 'F',
    homeTeam: 'Sweden',
    awayTeam: 'Tunisia',
    homeFlag: '🇸🇪',
    awayFlag: '🇹🇳',
    venue: 'TBD',
    city: 'TBD',
    tvUS: 'FS1',
  },
  // June 15
  {
    id: 'wc-g1',
    date: '2026-06-15',
    kickoffET: '12:00 PM ET',
    kickoffISO: '2026-06-15T16:00:00Z',
    group: 'G',
    homeTeam: 'Spain',
    awayTeam: 'Cape Verde',
    homeFlag: '🇪🇸',
    awayFlag: '🇨🇻',
    venue: 'TBD',
    city: 'TBD',
    tvUS: 'FOX',
  },
  {
    id: 'wc-h1',
    date: '2026-06-15',
    kickoffET: '3:00 PM ET',
    kickoffISO: '2026-06-15T19:00:00Z',
    group: 'H',
    homeTeam: 'Belgium',
    awayTeam: 'Egypt',
    homeFlag: '🇧🇪',
    awayFlag: '🇪🇬',
    venue: 'TBD',
    city: 'TBD',
    tvUS: 'FS1',
  },
  {
    id: 'wc-g2',
    date: '2026-06-15',
    kickoffET: '6:00 PM ET',
    kickoffISO: '2026-06-15T22:00:00Z',
    group: 'G',
    homeTeam: 'Saudi Arabia',
    awayTeam: 'Uruguay',
    homeFlag: '🇸🇦',
    awayFlag: '🇺🇾',
    venue: 'TBD',
    city: 'TBD',
    tvUS: 'FOX',
  },
  {
    id: 'wc-h2',
    date: '2026-06-15',
    kickoffET: '9:00 PM ET',
    kickoffISO: '2026-06-16T01:00:00Z',
    group: 'H',
    homeTeam: 'Iran',
    awayTeam: 'New Zealand',
    homeFlag: '🇮🇷',
    awayFlag: '🇳🇿',
    venue: 'TBD',
    city: 'TBD',
    tvUS: 'FS1',
  },
  // June 16
  {
    id: 'wc-i1',
    date: '2026-06-16',
    kickoffET: '3:00 PM ET',
    kickoffISO: '2026-06-16T19:00:00Z',
    group: 'I',
    homeTeam: 'France',
    awayTeam: 'Senegal',
    homeFlag: '🇫🇷',
    awayFlag: '🇸🇳',
    venue: 'TBD',
    city: 'TBD',
    tvUS: 'FOX',
  },
  {
    id: 'wc-i2',
    date: '2026-06-16',
    kickoffET: '6:00 PM ET',
    kickoffISO: '2026-06-16T22:00:00Z',
    group: 'I',
    homeTeam: 'Iraq',
    awayTeam: 'Norway',
    homeFlag: '🇮🇶',
    awayFlag: '🇳🇴',
    venue: 'TBD',
    city: 'TBD',
    tvUS: 'FS1',
  },
];

export const getMatchesForDate = (date) =>
  OPENING_MATCHES.filter(m => m.date === date);

export const getUpcomingMatches = () => {
  const today = new Date().toISOString().split('T')[0];
  return OPENING_MATCHES.filter(m => m.date >= today).slice(0, 10);
};

export const getNextMatchForTeam = (teamName) => {
  const today = new Date().toISOString().split('T')[0];
  return OPENING_MATCHES.find(m =>
    m.date >= today &&
    (m.homeTeam.includes(teamName) || m.awayTeam.includes(teamName))
  );
};
