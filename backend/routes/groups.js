const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');

function generateInviteCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// POST /api/groups/create
router.post('/create', async (req, res) => {
  try {
    const { userId, groupName } = req.body;

    if (!userId || !groupName) {
      return res.status(400).json({ error: 'userId and groupName are required' });
    }

    const inviteCode = generateInviteCode();

    const { data: group, error: groupError } = await supabase
      .from('groups')
      .insert({ name: groupName, invite_code: inviteCode, created_by: userId })
      .select()
      .single();

    if (groupError) {
      console.error('Group create error:', groupError);
      return res.status(500).json({ error: 'Failed to create group' });
    }

    const { error: memberError } = await supabase
      .from('group_members')
      .insert({ group_id: group.id, user_id: userId, display_name: 'You' });

    if (memberError) {
      console.error('Group member insert error:', memberError);
      return res.status(500).json({ error: 'Group created but failed to add creator as member' });
    }

    res.json({ success: true, group, inviteCode });
  } catch (error) {
    console.error('Groups create error:', error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// POST /api/groups/join
router.post('/join', async (req, res) => {
  try {
    const { userId, inviteCode, displayName } = req.body;

    if (!userId || !inviteCode || !displayName) {
      return res.status(400).json({ error: 'userId, inviteCode, and displayName are required' });
    }

    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('*')
      .eq('invite_code', inviteCode.toUpperCase())
      .single();

    if (groupError || !group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const { data: existing, error: existingError } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', group.id)
      .eq('user_id', userId)
      .single();

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('Membership check error:', existingError);
      return res.status(500).json({ error: 'Failed to check membership' });
    }

    if (existing) {
      return res.status(400).json({ error: 'Already in this group' });
    }

    const { error: memberError } = await supabase
      .from('group_members')
      .insert({ group_id: group.id, user_id: userId, display_name: displayName });

    if (memberError) {
      console.error('Join group error:', memberError);
      return res.status(500).json({ error: 'Failed to join group' });
    }

    res.json({ success: true, group });
  } catch (error) {
    console.error('Groups join error:', error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// GET /api/groups/:groupId/leaderboard
router.get('/:groupId/leaderboard', async (req, res) => {
  try {
    const { groupId } = req.params;

    const { data: leaderboard, error } = await supabase
      .from('group_members')
      .select('id, display_name, total_points, joined_at')
      .eq('group_id', groupId)
      .order('total_points', { ascending: false });

    if (error) {
      console.error('Leaderboard fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }

    res.json({ leaderboard: leaderboard ?? [] });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

module.exports = router;
