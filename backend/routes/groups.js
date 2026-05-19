const express = require('express');
const router = express.Router();

router.post('/create', async (req, res) => {
  try {
    const { name, userId } = req.body;
    // TODO: Phase 5 — generate invite code, persist group to Supabase
    res.json({ group: null });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

router.post('/join', async (req, res) => {
  try {
    const { inviteCode, userId, displayName } = req.body;
    // TODO: Phase 5 — look up group by invite code, add member
    res.json({ group: null });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

module.exports = router;
