// Official FIFA World Cup 2026 Group Stage Schedule
// Source: ESPN / FIFA official schedule
// All kickoff times stored as UTC ISO strings. Display times in ET (EDT = UTC-4).
// Matches spanning midnight ET are assigned to the matchday they belong to.

const WC_SCHEDULE = {
  '2026-06-11': [
    { homeTeam: 'Mexico',      awayTeam: 'South Africa', kickoff: '2026-06-11T23:00:00Z', kickoffET: '7:00 PM ET',  group: 'A', stage: 'Group A', venue: 'Estadio Azteca, Mexico City' },
    { homeTeam: 'South Korea', awayTeam: 'Czechia',      kickoff: '2026-06-12T02:00:00Z', kickoffET: '10:00 PM ET', group: 'A', stage: 'Group A', venue: 'Estadio Akron, Zapopan' },
  ],
  '2026-06-12': [
    { homeTeam: 'Canada',        awayTeam: 'Bosnia and Herzegovina', kickoff: '2026-06-12T19:00:00Z', kickoffET: '3:00 PM ET', group: 'B', stage: 'Group B', venue: 'BMO Field, Toronto' },
    { homeTeam: 'United States', awayTeam: 'Paraguay',               kickoff: '2026-06-13T01:00:00Z', kickoffET: '9:00 PM ET', group: 'D', stage: 'Group D', venue: 'SoFi Stadium, Inglewood' },
  ],
  '2026-06-13': [
    { homeTeam: 'Qatar',     awayTeam: 'Switzerland', kickoff: '2026-06-13T19:00:00Z', kickoffET: '3:00 PM ET',   group: 'B', stage: 'Group B', venue: "Levi's Stadium, Santa Clara" },
    { homeTeam: 'Brazil',    awayTeam: 'Morocco',     kickoff: '2026-06-13T22:00:00Z', kickoffET: '6:00 PM ET',   group: 'C', stage: 'Group C', venue: 'MetLife Stadium, East Rutherford' },
    { homeTeam: 'Haiti',     awayTeam: 'Scotland',    kickoff: '2026-06-14T01:00:00Z', kickoffET: '9:00 PM ET',   group: 'C', stage: 'Group C', venue: 'Gillette Stadium, Foxborough' },
    { homeTeam: 'Australia', awayTeam: 'Türkiye',     kickoff: '2026-06-14T04:00:00Z', kickoffET: '12:00 AM ET',  group: 'D', stage: 'Group D', venue: 'BC Place, Vancouver' },
  ],
  '2026-06-14': [
    { homeTeam: 'Germany',     awayTeam: 'Curaçao',  kickoff: '2026-06-14T17:00:00Z', kickoffET: '1:00 PM ET',  group: 'E', stage: 'Group E', venue: 'NRG Stadium, Houston' },
    { homeTeam: 'Netherlands', awayTeam: 'Japan',    kickoff: '2026-06-14T20:00:00Z', kickoffET: '4:00 PM ET',  group: 'F', stage: 'Group F', venue: 'AT&T Stadium, Arlington' },
    { homeTeam: 'Ivory Coast', awayTeam: 'Ecuador',  kickoff: '2026-06-14T23:00:00Z', kickoffET: '7:00 PM ET',  group: 'E', stage: 'Group E', venue: 'Lincoln Financial Field, Philadelphia' },
    { homeTeam: 'Sweden',      awayTeam: 'Tunisia',  kickoff: '2026-06-15T02:00:00Z', kickoffET: '10:00 PM ET', group: 'F', stage: 'Group F', venue: 'Estadio Guadalajara, Guadalajara' },
  ],
  '2026-06-15': [
    { homeTeam: 'Spain',        awayTeam: 'Cape Verde',  kickoff: '2026-06-15T17:00:00Z', kickoffET: '1:00 PM ET',  group: 'H', stage: 'Group H', venue: 'Mercedes-Benz Stadium, Atlanta' },
    { homeTeam: 'Belgium',      awayTeam: 'Egypt',       kickoff: '2026-06-15T22:00:00Z', kickoffET: '6:00 PM ET',  group: 'G', stage: 'Group G', venue: 'Lumen Field, Seattle' },
    { homeTeam: 'Saudi Arabia', awayTeam: 'Uruguay',     kickoff: '2026-06-15T22:00:00Z', kickoffET: '6:00 PM ET',  group: 'H', stage: 'Group H', venue: 'Hard Rock Stadium, Miami Gardens' },
    { homeTeam: 'Iran',         awayTeam: 'New Zealand', kickoff: '2026-06-16T04:00:00Z', kickoffET: '12:00 AM ET', group: 'G', stage: 'Group G', venue: 'SoFi Stadium, Inglewood' },
  ],
  '2026-06-16': [
    { homeTeam: 'France',    awayTeam: 'Senegal', kickoff: '2026-06-16T19:00:00Z', kickoffET: '3:00 PM ET',   group: 'I', stage: 'Group I', venue: 'MetLife Stadium, East Rutherford' },
    { homeTeam: 'Iraq',      awayTeam: 'Norway',  kickoff: '2026-06-16T22:00:00Z', kickoffET: '6:00 PM ET',   group: 'I', stage: 'Group I', venue: 'Gillette Stadium, Foxborough' },
    { homeTeam: 'Argentina', awayTeam: 'Algeria', kickoff: '2026-06-17T01:00:00Z', kickoffET: '9:00 PM ET',   group: 'J', stage: 'Group J', venue: 'Arrowhead Stadium, Kansas City' },
    { homeTeam: 'Austria',   awayTeam: 'Jordan',  kickoff: '2026-06-17T04:00:00Z', kickoffET: '12:00 AM ET',  group: 'J', stage: 'Group J', venue: "Levi's Stadium, Santa Clara" },
  ],
  '2026-06-17': [
    { homeTeam: 'Portugal',    awayTeam: 'DR Congo',   kickoff: '2026-06-17T17:00:00Z', kickoffET: '1:00 PM ET',  group: 'K', stage: 'Group K', venue: 'NRG Stadium, Houston' },
    { homeTeam: 'England',     awayTeam: 'Croatia',    kickoff: '2026-06-17T20:00:00Z', kickoffET: '4:00 PM ET',  group: 'L', stage: 'Group L', venue: 'AT&T Stadium, Arlington' },
    { homeTeam: 'Ghana',       awayTeam: 'Panama',     kickoff: '2026-06-17T23:00:00Z', kickoffET: '7:00 PM ET',  group: 'L', stage: 'Group L', venue: 'BMO Field, Toronto' },
    { homeTeam: 'Uzbekistan',  awayTeam: 'Colombia',   kickoff: '2026-06-18T02:00:00Z', kickoffET: '10:00 PM ET', group: 'K', stage: 'Group K', venue: 'Estadio Azteca, Mexico City' },
  ],
  '2026-06-18': [
    { homeTeam: 'Czechia',      awayTeam: 'South Africa',           kickoff: '2026-06-18T16:00:00Z', kickoffET: '12:00 PM ET', group: 'A', stage: 'Group A', venue: 'Mercedes-Benz Stadium, Atlanta' },
    { homeTeam: 'Switzerland',  awayTeam: 'Bosnia and Herzegovina', kickoff: '2026-06-18T19:00:00Z', kickoffET: '3:00 PM ET',  group: 'B', stage: 'Group B', venue: 'SoFi Stadium, Inglewood' },
    { homeTeam: 'Canada',       awayTeam: 'Qatar',                  kickoff: '2026-06-18T22:00:00Z', kickoffET: '6:00 PM ET',  group: 'B', stage: 'Group B', venue: 'BC Place, Vancouver' },
    { homeTeam: 'Mexico',       awayTeam: 'South Korea',            kickoff: '2026-06-19T03:00:00Z', kickoffET: '11:00 PM ET', group: 'A', stage: 'Group A', venue: 'Estadio Akron, Zapopan' },
  ],
  '2026-06-19': [
    { homeTeam: 'United States', awayTeam: 'Australia', kickoff: '2026-06-19T19:00:00Z', kickoffET: '3:00 PM ET',   group: 'D', stage: 'Group D', venue: 'Lumen Field, Seattle' },
    { homeTeam: 'Scotland',      awayTeam: 'Morocco',   kickoff: '2026-06-19T22:00:00Z', kickoffET: '6:00 PM ET',   group: 'C', stage: 'Group C', venue: 'Gillette Stadium, Foxborough' },
    { homeTeam: 'Brazil',        awayTeam: 'Haiti',     kickoff: '2026-06-20T01:00:00Z', kickoffET: '9:00 PM ET',   group: 'C', stage: 'Group C', venue: 'Lincoln Financial Field, Philadelphia' },
    { homeTeam: 'Türkiye',       awayTeam: 'Paraguay',  kickoff: '2026-06-20T04:00:00Z', kickoffET: '12:00 AM ET',  group: 'D', stage: 'Group D', venue: "Levi's Stadium, Santa Clara" },
  ],
  '2026-06-20': [
    { homeTeam: 'Netherlands', awayTeam: 'Sweden',   kickoff: '2026-06-20T17:00:00Z', kickoffET: '1:00 PM ET',  group: 'F', stage: 'Group F', venue: 'NRG Stadium, Houston' },
    { homeTeam: 'Germany',     awayTeam: 'Ivory Coast', kickoff: '2026-06-20T20:00:00Z', kickoffET: '4:00 PM ET',  group: 'E', stage: 'Group E', venue: 'BMO Field, Toronto' },
    { homeTeam: 'Ecuador',     awayTeam: 'Curaçao',  kickoff: '2026-06-21T00:00:00Z', kickoffET: '8:00 PM ET',  group: 'E', stage: 'Group E', venue: 'Arrowhead Stadium, Kansas City' },
    { homeTeam: 'Tunisia',     awayTeam: 'Japan',    kickoff: '2026-06-21T04:00:00Z', kickoffET: '12:00 AM ET', group: 'F', stage: 'Group F', venue: 'Estadio Guadalajara, Guadalajara' },
  ],
  '2026-06-21': [
    { homeTeam: 'Spain',        awayTeam: 'Saudi Arabia', kickoff: '2026-06-21T16:00:00Z', kickoffET: '12:00 PM ET', group: 'H', stage: 'Group H', venue: 'Mercedes-Benz Stadium, Atlanta' },
    { homeTeam: 'Belgium',      awayTeam: 'Iran',         kickoff: '2026-06-21T19:00:00Z', kickoffET: '3:00 PM ET',  group: 'G', stage: 'Group G', venue: 'SoFi Stadium, Inglewood' },
    { homeTeam: 'Uruguay',      awayTeam: 'Cape Verde',   kickoff: '2026-06-21T22:00:00Z', kickoffET: '6:00 PM ET',  group: 'H', stage: 'Group H', venue: 'Hard Rock Stadium, Miami Gardens' },
    { homeTeam: 'New Zealand',  awayTeam: 'Egypt',        kickoff: '2026-06-22T01:00:00Z', kickoffET: '9:00 PM ET',  group: 'G', stage: 'Group G', venue: 'BC Place, Vancouver' },
  ],
  '2026-06-22': [
    { homeTeam: 'Argentina', awayTeam: 'Austria',  kickoff: '2026-06-22T17:00:00Z', kickoffET: '1:00 PM ET',  group: 'J', stage: 'Group J', venue: 'AT&T Stadium, Arlington' },
    { homeTeam: 'France',    awayTeam: 'Iraq',     kickoff: '2026-06-22T21:00:00Z', kickoffET: '5:00 PM ET',  group: 'I', stage: 'Group I', venue: 'Lincoln Financial Field, Philadelphia' },
    { homeTeam: 'Norway',    awayTeam: 'Senegal',  kickoff: '2026-06-23T00:00:00Z', kickoffET: '8:00 PM ET',  group: 'I', stage: 'Group I', venue: 'MetLife Stadium, East Rutherford' },
    { homeTeam: 'Jordan',    awayTeam: 'Algeria',  kickoff: '2026-06-23T03:00:00Z', kickoffET: '11:00 PM ET', group: 'J', stage: 'Group J', venue: "Levi's Stadium, Santa Clara" },
  ],
  '2026-06-23': [
    { homeTeam: 'Portugal',  awayTeam: 'Uzbekistan', kickoff: '2026-06-23T17:00:00Z', kickoffET: '1:00 PM ET',  group: 'K', stage: 'Group K', venue: 'NRG Stadium, Houston' },
    { homeTeam: 'England',   awayTeam: 'Ghana',      kickoff: '2026-06-23T20:00:00Z', kickoffET: '4:00 PM ET',  group: 'L', stage: 'Group L', venue: 'Gillette Stadium, Foxborough' },
    { homeTeam: 'Panama',    awayTeam: 'Croatia',    kickoff: '2026-06-23T23:00:00Z', kickoffET: '7:00 PM ET',  group: 'L', stage: 'Group L', venue: 'BMO Field, Toronto' },
    { homeTeam: 'Colombia',  awayTeam: 'DR Congo',   kickoff: '2026-06-24T02:00:00Z', kickoffET: '10:00 PM ET', group: 'K', stage: 'Group K', venue: 'Estadio Akron, Zapopan' },
  ],
  '2026-06-24': [
    { homeTeam: 'Switzerland',          awayTeam: 'Canada',      kickoff: '2026-06-24T19:00:00Z', kickoffET: '3:00 PM ET', group: 'B', stage: 'Group B', venue: 'BC Place, Vancouver' },
    { homeTeam: 'Bosnia and Herzegovina', awayTeam: 'Qatar',     kickoff: '2026-06-24T19:00:00Z', kickoffET: '3:00 PM ET', group: 'B', stage: 'Group B', venue: 'Lumen Field, Seattle' },
    { homeTeam: 'Scotland',             awayTeam: 'Brazil',      kickoff: '2026-06-24T22:00:00Z', kickoffET: '6:00 PM ET', group: 'C', stage: 'Group C', venue: 'Hard Rock Stadium, Miami Gardens' },
    { homeTeam: 'Morocco',              awayTeam: 'Haiti',       kickoff: '2026-06-24T22:00:00Z', kickoffET: '6:00 PM ET', group: 'C', stage: 'Group C', venue: 'Mercedes-Benz Stadium, Atlanta' },
    { homeTeam: 'Czechia',              awayTeam: 'Mexico',      kickoff: '2026-06-25T01:00:00Z', kickoffET: '9:00 PM ET', group: 'A', stage: 'Group A', venue: 'Estadio Azteca, Mexico City' },
    { homeTeam: 'South Africa',         awayTeam: 'South Korea', kickoff: '2026-06-25T01:00:00Z', kickoffET: '9:00 PM ET', group: 'A', stage: 'Group A', venue: 'Estadio Guadalajara, Guadalajara' },
  ],
  '2026-06-25': [
    { homeTeam: 'Ecuador',       awayTeam: 'Germany',      kickoff: '2026-06-25T20:00:00Z', kickoffET: '4:00 PM ET',  group: 'E', stage: 'Group E', venue: 'MetLife Stadium, East Rutherford' },
    { homeTeam: 'Curaçao',       awayTeam: 'Ivory Coast',  kickoff: '2026-06-25T20:00:00Z', kickoffET: '4:00 PM ET',  group: 'E', stage: 'Group E', venue: 'Lincoln Financial Field, Philadelphia' },
    { homeTeam: 'Japan',         awayTeam: 'Sweden',       kickoff: '2026-06-25T23:00:00Z', kickoffET: '7:00 PM ET',  group: 'F', stage: 'Group F', venue: 'AT&T Stadium, Arlington' },
    { homeTeam: 'Tunisia',       awayTeam: 'Netherlands',  kickoff: '2026-06-25T23:00:00Z', kickoffET: '7:00 PM ET',  group: 'F', stage: 'Group F', venue: 'Arrowhead Stadium, Kansas City' },
    { homeTeam: 'Türkiye',       awayTeam: 'United States', kickoff: '2026-06-26T02:00:00Z', kickoffET: '10:00 PM ET', group: 'D', stage: 'Group D', venue: 'SoFi Stadium, Inglewood' },
    { homeTeam: 'Paraguay',      awayTeam: 'Australia',    kickoff: '2026-06-26T02:00:00Z', kickoffET: '10:00 PM ET', group: 'D', stage: 'Group D', venue: "Levi's Stadium, Santa Clara" },
  ],
  '2026-06-26': [
    { homeTeam: 'Norway',       awayTeam: 'France',        kickoff: '2026-06-26T19:00:00Z', kickoffET: '3:00 PM ET',  group: 'I', stage: 'Group I', venue: 'Gillette Stadium, Foxborough' },
    { homeTeam: 'Senegal',      awayTeam: 'Iraq',          kickoff: '2026-06-26T19:00:00Z', kickoffET: '3:00 PM ET',  group: 'I', stage: 'Group I', venue: 'BMO Field, Toronto' },
    { homeTeam: 'Cape Verde',   awayTeam: 'Saudi Arabia',  kickoff: '2026-06-27T00:00:00Z', kickoffET: '8:00 PM ET',  group: 'H', stage: 'Group H', venue: 'NRG Stadium, Houston' },
    { homeTeam: 'Uruguay',      awayTeam: 'Spain',         kickoff: '2026-06-27T00:00:00Z', kickoffET: '8:00 PM ET',  group: 'H', stage: 'Group H', venue: 'Estadio Akron, Zapopan' },
    { homeTeam: 'Egypt',        awayTeam: 'Iran',          kickoff: '2026-06-27T03:00:00Z', kickoffET: '11:00 PM ET', group: 'G', stage: 'Group G', venue: 'Lumen Field, Seattle' },
    { homeTeam: 'New Zealand',  awayTeam: 'Belgium',       kickoff: '2026-06-27T03:00:00Z', kickoffET: '11:00 PM ET', group: 'G', stage: 'Group G', venue: 'BC Place, Vancouver' },
  ],
  '2026-06-27': [
    { homeTeam: 'Panama',    awayTeam: 'England',     kickoff: '2026-06-27T21:00:00Z', kickoffET: '5:00 PM ET',   group: 'L', stage: 'Group L', venue: 'MetLife Stadium, East Rutherford' },
    { homeTeam: 'Croatia',   awayTeam: 'Ghana',       kickoff: '2026-06-27T21:00:00Z', kickoffET: '5:00 PM ET',   group: 'L', stage: 'Group L', venue: 'Lincoln Financial Field, Philadelphia' },
    { homeTeam: 'Colombia',  awayTeam: 'Portugal',    kickoff: '2026-06-27T23:30:00Z', kickoffET: '7:30 PM ET',   group: 'K', stage: 'Group K', venue: 'Hard Rock Stadium, Miami Gardens' },
    { homeTeam: 'DR Congo',  awayTeam: 'Uzbekistan',  kickoff: '2026-06-27T23:30:00Z', kickoffET: '7:30 PM ET',   group: 'K', stage: 'Group K', venue: 'Mercedes-Benz Stadium, Atlanta' },
    { homeTeam: 'Algeria',   awayTeam: 'Austria',     kickoff: '2026-06-28T02:00:00Z', kickoffET: '10:00 PM ET',  group: 'J', stage: 'Group J', venue: 'Arrowhead Stadium, Kansas City' },
    { homeTeam: 'Jordan',    awayTeam: 'Argentina',   kickoff: '2026-06-28T02:00:00Z', kickoffET: '10:00 PM ET',  group: 'J', stage: 'Group J', venue: 'AT&T Stadium, Arlington' },
  ],
};

function getMatchesForDate(date) {
  return WC_SCHEDULE[date] || [];
}

module.exports = { WC_SCHEDULE, getMatchesForDate };
