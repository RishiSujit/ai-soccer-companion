'use strict';

const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios');
require('dotenv').config();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function generatePreMatchBriefing(
  homeTeam, awayTeam, stage,
  userTeam, userSports, kickoffTime
) {
  const prompt = `You are writing a pre-match briefing for a casual American sports fan called Sam who supports ${userTeam}.

Match: ${homeTeam} vs ${awayTeam}
Stage: ${stage}
Sam's team: ${userTeam}
Sam follows: ${userSports.join(', ')}

Write a briefing Sam can read in 60 seconds that makes him feel prepared walking into a watch party.

Structure it EXACTLY like this with these exact headers:

THE STORY SO FAR
[2 sentences about how ${userTeam} got to this point in the tournament. Reference their journey so far.]

WHO TO WATCH
[Name one key player and explain why they matter using a specific ${userSports[0]} analogy.]

THE ONE THING TO KNOW
[One tactical or narrative fact that will make Sam sound knowledgeable. Under 2 sentences.]

TALKING POINT FOR THE ROOM
[One debatable question or hot take Sam can bring up with friends.]

Keep the whole briefing under 120 words.
No markdown, no bold, no bullets.
Plain conversational English only.
Write like a knowledgeable friend texting Sam before the game.
End with: "You're ready. Go watch. ⚽"`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 300,
    messages: [{ role: 'user', content: prompt }],
  });

  return response.content[0].text;
}

async function checkAndGenerateBriefings(userTeam, userSports) {
  try {
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const fourHoursFromNow = new Date(now.getTime() + 4 * 60 * 60 * 1000);

    const { getUpcomingFixtures } = require('../lib/livescoreApi');
    const allFixtures = await getUpcomingFixtures(1); // next 24 hours

    const upcoming = allFixtures.filter(f => {
      const kickoff = new Date(f.kickoff);
      const involvesTeam =
        f.homeTeam === userTeam || f.awayTeam === userTeam;
      const inWindow =
        kickoff >= twoHoursFromNow && kickoff <= fourHoursFromNow;
      return involvesTeam && inWindow;
    });

    if (upcoming.length === 0) return null;

    const fixture = upcoming[0];
    const homeTeam = fixture.homeTeam;
    const awayTeam = fixture.awayTeam;
    const stage = fixture.stage || 'Group Stage';
    const kickoffTime = fixture.kickoff;

    const briefingText = await generatePreMatchBriefing(
      homeTeam, awayTeam, stage,
      userTeam, userSports, kickoffTime
    );

    return {
      homeTeam,
      awayTeam,
      stage,
      kickoffTime,
      briefing: briefingText,
      fixtureId: fixture.id,
    };
  } catch (err) {
    console.error('Briefing generation error:', err.message);
    return null;
  }
}

module.exports = { checkAndGenerateBriefings, generatePreMatchBriefing };
