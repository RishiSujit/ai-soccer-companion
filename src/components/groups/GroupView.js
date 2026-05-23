import { useState, useEffect } from 'react';
import { createGroup, joinGroup } from '../../services/api';
import { supabase } from '../../lib/supabase';

function getInitials(name) {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function GroupView({ userContext, userId, isGuest, onShowAuth }) {
  const [phase, setPhase] = useState('loading'); // loading | idle | creating | joining | joined
  const [group, setGroup] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadLeaderboard = async (groupIdParam) => {
    const id = groupIdParam || group?.id;
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select('user_id, display_name, total_points')
        .eq('group_id', id)
        .order('total_points', { ascending: false });
      if (!error && data) setLeaderboard(data);
    } catch {
      // Fail silently — stale leaderboard is better than a crash
    }
  };

  useEffect(() => {
    console.log('GroupView mounted, userId:', userId);
    loadExistingGroup();
  }, [userId]);

  async function loadExistingGroup() {
    console.log('=== LOAD EXISTING GROUP ===');
    console.log('userId:', userId);

    if (!userId) {
      console.log('No userId — skipping');
      setPhase('idle');
      return;
    }

    try {
      console.log('Querying group_members...');
      const { data, error } = await supabase
        .from('group_members')
        .select(`
          display_name,
          total_points,
          groups (
            id,
            name,
            invite_code,
            created_by
          )
        `)
        .eq('user_id', userId)
        .limit(1)
        .single();

      console.log('Query result:', data);
      console.log('Query error:', error);

      if (error || !data) {
        console.log('No group found');
        setPhase('idle');
        return;
      }

      console.log('Group found:', data.groups);
      setGroup(data.groups);
      setPhase('joined');
      if (data.groups?.id) loadLeaderboard(data.groups.id);
    } catch (err) {
      console.error('Load group error:', err);
      setPhase('idle');
    }
  }

  if (isGuest) {
    return (
      <div className="guest-lock">
        <div className="guest-lock__icon">🔒</div>
        <div className="guest-lock__title">Sign up to play with friends</div>
        <div className="guest-lock__desc">
          Create a free account to start a group, share an invite code, and compete on the leaderboard.
        </div>
        <button className="guest-lock__cta" onClick={() => onShowAuth('signup')}>
          Create free account →
        </button>
        <button className="guest-lock__secondary" onClick={() => onShowAuth('signin')}>
          Already have an account? Sign in
        </button>
      </div>
    );
  }

  if (phase === 'loading') {
    return (
      <div className="group-view" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4444aa', fontSize: '12px' }}>
        Loading...
      </div>
    );
  }

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await createGroup(userId, groupName.trim());
      if (data.error) {
        setError(data.error);
      } else {
        setGroup(data.group);
        setPhase('joined');
        loadLeaderboard(data.group.id);
      }
    } catch {
      setError('Failed to create group. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim() || !displayName.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await joinGroup(userId, inviteCode.trim(), displayName.trim());
      if (data.error) {
        setError(data.error);
      } else {
        setGroup(data.group);
        setPhase('joined');
        loadLeaderboard(data.group.id);
      }
    } catch {
      setError('Failed to join group. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(group.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm('Leave this group?')) return;
    try {
      await supabase
        .from('group_members')
        .delete()
        .eq('user_id', userId)
        .eq('group_id', group.id);
      setGroup(null);
      setLeaderboard([]);
      setPhase('idle');
    } catch {
      // Fail silently
    }
  };

  return (
    <div className="group-view">

      {/* ── Joined state ─────────────────────────────────────── */}
      {phase === 'joined' && group && (
        <div className="group-joined">
          <div className="group-joined-header">
            <div>
              <div className="group-joined-name">{group.name}</div>
              <div className="group-joined-sub">
                {leaderboard.length} member{leaderboard.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>

          <div className="invite-bar">
            <div>
              <div className="invite-label">INVITE CODE</div>
              <div className="invite-code-display">{group.invite_code}</div>
            </div>
            <div className="copy-btn" onClick={handleCopyInvite}>
              {copied ? 'Copied!' : 'Copy code'}
            </div>
          </div>

          <div className="leaderboard-section">
            <div className="lb-section-title">Leaderboard</div>
            {leaderboard.length === 0 ? (
              <div className="lb-empty">No predictions locked in yet. Be the first!</div>
            ) : (
              leaderboard.map((member, index) => (
                <div
                  key={member.user_id || index}
                  className={`lb-row2 ${member.user_id === userId ? 'lb-row-you' : ''}`}
                >
                  <div className={`lb-rank2 ${index === 0 ? 'g' : ''}`}>{index + 1}</div>
                  <div className="lb-av">{getInitials(member.display_name || 'Fan')}</div>
                  <div className="lb-nm">
                    {member.display_name || 'Fan'}
                    {member.user_id === userId && <span className="you-tag">you</span>}
                  </div>
                  <div className="lb-pt">{member.total_points || 0}</div>
                </div>
              ))
            )}
          </div>

          <div className="leave-group" onClick={handleLeaveGroup}>Leave group</div>
        </div>
      )}

      {/* ── Idle state ───────────────────────────────────────── */}
      {phase === 'idle' && (
        <>
          <p className="group-view__intro">
            Compete with friends by predicting match results and prop bets.
          </p>
          <div className="group-cards">
            <button
              className="group-card group-card--primary"
              onClick={() => { setPhase('creating'); setError(null); }}
            >
              <div className="group-card__icon">+</div>
              <div className="group-card__title">Create a Group</div>
              <div className="group-card__desc">Start a new group and invite friends with a code</div>
            </button>
            <button
              className="group-card"
              onClick={() => { setPhase('joining'); setError(null); }}
            >
              <div className="group-card__icon">→</div>
              <div className="group-card__title">Join a Group</div>
              <div className="group-card__desc">Enter an invite code to join a friend's group</div>
            </button>
          </div>
        </>
      )}

      {/* ── Create form ──────────────────────────────────────── */}
      {phase === 'creating' && (
        <form className="group-form" onSubmit={handleCreate}>
          <div className="group-form__title">Create a Group</div>
          <input
            className="group-form__input"
            type="text"
            placeholder="Group name"
            value={groupName}
            onChange={e => setGroupName(e.target.value)}
            disabled={isLoading}
            autoFocus
          />
          {error && <div className="group-form__error">{error}</div>}
          <button className="group-form__submit" type="submit" disabled={isLoading || !groupName.trim()}>
            {isLoading ? 'Creating...' : 'Create Group'}
          </button>
          <button className="group-form__cancel" type="button" onClick={() => { setPhase('idle'); setError(null); }}>
            Cancel
          </button>
        </form>
      )}

      {/* ── Join form ────────────────────────────────────────── */}
      {phase === 'joining' && (
        <form className="group-form" onSubmit={handleJoin}>
          <div className="group-form__title">Join a Group</div>
          <input
            className="group-form__input"
            type="text"
            placeholder="Invite code (e.g. ABC123)"
            value={inviteCode}
            onChange={e => setInviteCode(e.target.value.toUpperCase())}
            disabled={isLoading}
            maxLength={6}
            autoFocus
          />
          <input
            className="group-form__input"
            type="text"
            placeholder="Your display name"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            disabled={isLoading}
          />
          {error && <div className="group-form__error">{error}</div>}
          <button className="group-form__submit" type="submit" disabled={isLoading || !inviteCode.trim() || !displayName.trim()}>
            {isLoading ? 'Joining...' : 'Join Group'}
          </button>
          <button className="group-form__cancel" type="button" onClick={() => { setPhase('idle'); setError(null); }}>
            Cancel
          </button>
        </form>
      )}

    </div>
  );
}

export default GroupView;
