'use strict';

const express = require('express');
const router = express.Router();
const { checkAndGenerateBriefings } = require('../jobs/generateBriefing');

// GET /api/briefing?userTeam=Argentina&userSports=NFL,NBA
// Frontend polls every 30 minutes to check for upcoming matches
router.get('/', async (req, res) => {
  try {
    const { userTeam, userSports } = req.query;

    if (!userTeam) {
      return res.json({ briefing: null });
    }

    const sports = userSports ? userSports.split(',') : ['NFL', 'NBA'];

    const result = await checkAndGenerateBriefings(userTeam, sports);

    res.json({ briefing: result || null });
  } catch (err) {
    console.error('Briefing route error:', err.message);
    res.json({ briefing: null });
  }
});

module.exports = router;
