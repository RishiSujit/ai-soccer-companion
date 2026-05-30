'use strict';

// TEST ONLY — Champions League Final PSG vs Arsenal May 30 2026
// Delete this file after World Cup deployment

module.exports = {

  TEST_MATCH: {
    id: 'test-ucl-final-2026',
    fixtureId: 'test-ucl-final-2026',
    homeTeam: 'Paris Saint-Germain',
    awayTeam: 'Arsenal',
    homeTeamShort: 'PSG',
    awayTeamShort: 'ARS',
    homeFlag: '🇫🇷',
    awayFlag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    stage: 'Champions League Final',
    tournament: 'UEFA Champions League',
    venue: 'Puskás Aréna, Budapest',
    kickoff: '2026-05-30T16:00:00Z',
    kickoffDisplay: 'Sat May 30 · 12:00 PM ET',
    leagueId: 2,
    season: 2025,
    isTestMatch: true,
  },

  TEST_PREDICTION_CARD: {
    date: '2026-05-30',
    matches: [
      {
        homeTeam: 'Paris Saint-Germain',
        awayTeam: 'Arsenal',
        stage: 'Champions League Final',
        kickoff: '2026-05-30T16:00:00Z',
      },
    ],
    daily_questions: [
      {
        id: 'dq1',
        question: 'Will there be a red card in the Champions League Final?',
        options: ['Yes', 'No'],
        points: 2,
        type: 'yes_no',
      },
      {
        id: 'dq2',
        question: 'How many total goals in the final?',
        options: ['0-1', '2-3', '4+'],
        points: 3,
        type: 'multi',
      },
      {
        id: 'dq3',
        question: 'Does the match go to extra time or penalties?',
        options: ['Yes', 'No'],
        points: 2,
        type: 'yes_no',
      },
    ],
    feature_match: {
      homeTeam: 'Paris Saint-Germain',
      awayTeam: 'Arsenal',
      stage: 'Champions League Final',
      reason: "Europe's biggest club match — PSG vs Arsenal for the title.",
      props: [
        {
          id: 'fm1',
          question: 'Match result?',
          options: ['PSG win', 'Draw after 90 mins', 'Arsenal win'],
          points: 3,
          type: 'multi',
        },
        {
          id: 'fm2',
          question: 'Will Mbappe score?',
          options: ['Yes', 'No'],
          points: 2,
          type: 'yes_no',
        },
        {
          id: 'fm3',
          question: "First goal before or after 45 minutes?",
          options: ["Before 45'", "After 45'", 'No goals in 90 mins'],
          points: 2,
          type: 'multi',
        },
      ],
    },
    bonus: {
      id: 'bonus1',
      question: 'PSG win AND Mbappe scores at least one goal',
      points: 10,
      type: 'bonus',
      components: [
        'PSG win the Champions League',
        'Mbappe scores in the match',
      ],
    },
  },
};
