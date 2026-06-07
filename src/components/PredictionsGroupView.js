import { useState, useEffect } from 'react';
import {
  createGroup,
  joinGroup,
} from '../services/api';
import { supabase } from '../lib/supabase';
import DailyCardView from './DailyCardView';
import CelebrationOverlay from './CelebrationOverlay';
import './PredictionsGroupView.css';

function getInitials(name) {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function PredictionsGroupView({ userId, userName, userContext, isGuest, onShowAuth, onNavigate }) {
  const [group, setGroup] = useState(() => {
    if (!userId || isGuest) return null;
    try {
      const cached = localStorage.getItem(`wcc_group_${userId}`);
      return cached ? JSON.parse(cached) : null;
    } catch { return null; }
  });
  const [leaderboard, setLeaderboard] = useState([]);
  const [groupPhase, setGroupPhase] = useState(() => {
    if (!userId || isGuest) return 'idle';
    try {
      return localStorage.getItem(`wcc_group_${userId}`) ? 'joined' : 'loading';
    } catch { return 'loading'; }
  });

  // Group form state
  const [groupName, setGroupName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [groupError, setGroupError] = useState(null);
  const [groupLoading, setGroupLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Celebration state
  const [celebration, setCelebration] = useState({ show: false, message: '', points: 0 });

  // Load existing group on mount
  useEffect(() => {
    if (!userId || isGuest) {
      setGroupPhase('idle');
      return;
    }
    loadExistingGroup();
  }, [userId, isGuest]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-check group when user returns to tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && userId && !isGuest) {
        loadExistingGroup();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [userId, isGuest]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadExistingGroup() {
    try {
      // Confirm session is active — anonymous/expired sessions return null silently
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setGroupPhase(p => p === 'loading' ? 'idle' : p);
        return;
      }

      // Use array query — maybeSingle() returns null on both empty AND RLS block,
      // which would incorrectly wipe the cache. Array query lets us distinguish.
      const { data: memberships, error: memErr } = await supabase
        .from('group_members')
        .select('group_id, total_points')
        .eq('user_id', userId);

      if (memErr) {
        // DB error — preserve cached group, only un-stick a loading spinner
        console.error('Membership query error:', memErr);
        setGroupPhase(p => p === 'loading' ? 'idle' : p);
        return;
      }

      if (!memberships?.length) {
        // Confirmed: user has no memberships in DB — safe to clear
        setGroup(null);
        setGroupPhase('idle');
        setLeaderboard([]);
        try { localStorage.removeItem(`wcc_group_${userId}`); } catch {}
        return;
      }

      const membership = memberships[0];

      const { data: groupData, error: groupErr } = await supabase
        .from('groups')
        .select('*')
        .eq('id', membership.group_id)
        .maybeSingle();

      if (groupErr || !groupData) {
        // Group fetch failed — preserve cached state
        setGroupPhase(p => p === 'loading' ? 'idle' : p);
        return;
      }

      setGroup(groupData);
      setGroupPhase('joined');
      try {
        localStorage.setItem(`wcc_group_${userId}`, JSON.stringify({
          id: groupData.id, name: groupData.name, invite_code: groupData.invite_code,
        }));
      } catch {}
      loadLeaderboard(membership.group_id);
    } catch (err) {
      console.error('Group load error:', err);
      // Network / unexpected error — preserve cached group, don't wipe state
      setGroupPhase(p => p === 'loading' ? 'idle' : p);
    }
  }

  async function loadLeaderboard(groupId) {
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select('user_id, display_name, total_points')
        .eq('group_id', groupId)
        .order('total_points', { ascending: false });
      if (!error && data) setLeaderboard(data);
    } catch {
      // Fail silently
    }
  }

  // ── Group handlers ───────────────────────────────────────

  async function handleCreate(e) {
    e.preventDefault();
    if (!groupName.trim()) return;
    setGroupLoading(true);
    setGroupError(null);
    try {
      const data = await createGroup(userId, groupName.trim());
      if (data.error) {
        setGroupError(data.error);
      } else {
        setGroup(data.group);
        setGroupPhase('joined');
        try {
          localStorage.setItem(`wcc_group_${userId}`, JSON.stringify({
            id: data.group.id, name: data.group.name, invite_code: data.group.invite_code,
          }));
        } catch {}
        loadLeaderboard(data.group.id);
      }
    } catch {
      setGroupError('Failed to create group. Try again.');
    } finally {
      setGroupLoading(false);
    }
  }

  async function handleJoin(e) {
    e.preventDefault();
    if (!inviteCode.trim() || !displayName.trim()) return;
    setGroupLoading(true);
    setGroupError(null);
    try {
      const data = await joinGroup(userId, inviteCode.trim(), displayName.trim());
      if (data.error) {
        setGroupError(data.error);
      } else {
        setGroup(data.group);
        setGroupPhase('joined');
        try {
          localStorage.setItem(`wcc_group_${userId}`, JSON.stringify({
            id: data.group.id, name: data.group.name, invite_code: data.group.invite_code,
          }));
        } catch {}
        loadLeaderboard(data.group.id);
      }
    } catch {
      setGroupError('Failed to join group. Try again.');
    } finally {
      setGroupLoading(false);
    }
  }

  function handleCopyInvite() {
    navigator.clipboard.writeText(group.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleLeaveGroup() {
    if (!window.confirm('Leave this group?')) return;
    try {
      await supabase
        .from('group_members')
        .delete()
        .eq('user_id', userId)
        .eq('group_id', group.id);
      setGroup(null);
      setLeaderboard([]);
      setGroupPhase('idle');
      try { localStorage.removeItem(`wcc_group_${userId}`); } catch {};
    } catch {
      // Fail silently
    }
  }

  const dismissCelebration = () => {
    setCelebration(prev => ({ ...prev, show: false }));
  };

  return (
    <div className="predictions-page">

      <CelebrationOverlay
        show={celebration.show}
        message={celebration.message}
        points={celebration.points}
        onDismiss={dismissCelebration}
      />

      {/* ── Page header ──────────────────────────────────── */}
      <div className="predictions-header">
        <div>
          <div className="predictions-title">Predictions</div>
          <div className="predictions-subtitle">Daily card · Compete with your group</div>
        </div>
        <div className="predictions-header-right">
          {groupPhase === 'joined' && group ? (
            <div className="group-pill">
              <span className="group-pill__name">{group.name}</span>
              <span className="group-pill__code">{group.invite_code}</span>
              <button className="group-pill__invite" onClick={handleCopyInvite}>
                {copied ? 'Copied!' : 'Invite'}
              </button>
            </div>
          ) : (
            <div className="group-header-btns">
              <button
                className="group-header-btn"
                onClick={() => { setGroupPhase('creating'); setGroupError(null); }}
              >
                + Create group
              </button>
              <button
                className="group-header-btn"
                onClick={() => { setGroupPhase('joining'); setGroupError(null); }}
              >
                → Join group
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Two column grid ──────────────────────────────── */}
      <div className="predictions-grid">

        {/* LEFT — Daily card */}
        <div className="predictions-left">
          <DailyCardView
            userId={userId}
            userContext={userContext}
            isGuest={isGuest}
            onShowAuth={onShowAuth}
            onNavigateToCompanion={onNavigate
              ? (question) => onNavigate('companion', { general: true, preloadedQuestion: question, fromPredictions: true })
              : null}
          />
        </div>

        {/* RIGHT — Group section */}
        <div className="predictions-right">

          {groupPhase === 'loading' && (
            <div className="pgv-loading">Loading group...</div>
          )}

          {groupPhase === 'idle' && (
            <>
              <button
                className="group-card group-card--primary"
                onClick={() => { setGroupPhase('creating'); setGroupError(null); }}
              >
                <div className="group-card__icon">+</div>
                <div className="group-card__title">Create a Group</div>
                <div className="group-card__desc">Start a new group and invite friends with a code</div>
              </button>
              <button
                className="group-card"
                onClick={() => { setGroupPhase('joining'); setGroupError(null); }}
              >
                <div className="group-card__icon">→</div>
                <div className="group-card__title">Join a Group</div>
                <div className="group-card__desc">Enter an invite code to join a friend's group</div>
              </button>
            </>
          )}

          {groupPhase === 'creating' && (
            <form className="group-form" onSubmit={handleCreate}>
              <div className="group-form__title">Create a Group</div>
              <input
                className="group-form__input"
                type="text"
                placeholder="Group name"
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                disabled={groupLoading}
                autoFocus
              />
              {groupError && <div className="group-form__error">{groupError}</div>}
              <button
                className="group-form__submit"
                type="submit"
                disabled={groupLoading || !groupName.trim()}
              >
                {groupLoading ? 'Creating...' : 'Create Group'}
              </button>
              <button
                className="group-form__cancel"
                type="button"
                onClick={() => { setGroupPhase('idle'); setGroupError(null); }}
              >
                Cancel
              </button>
            </form>
          )}

          {groupPhase === 'joining' && (
            <form className="group-form" onSubmit={handleJoin}>
              <div className="group-form__title">Join a Group</div>
              <input
                className="group-form__input"
                type="text"
                placeholder="Invite code (e.g. ABC123)"
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value.toUpperCase())}
                disabled={groupLoading}
                maxLength={6}
                autoFocus
              />
              <input
                className="group-form__input"
                type="text"
                placeholder="Your display name"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                disabled={groupLoading}
              />
              {groupError && <div className="group-form__error">{groupError}</div>}
              <button
                className="group-form__submit"
                type="submit"
                disabled={groupLoading || !inviteCode.trim() || !displayName.trim()}
              >
                {groupLoading ? 'Joining...' : 'Join Group'}
              </button>
              <button
                className="group-form__cancel"
                type="button"
                onClick={() => { setGroupPhase('idle'); setGroupError(null); }}
              >
                Cancel
              </button>
            </form>
          )}

          {groupPhase === 'joined' && group && (
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
                      className={`lb-row2 leaderboard-row ${member.user_id === userId ? 'lb-row-you' : ''}`}
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
        </div>
      </div>
    </div>
  );
}

export default PredictionsGroupView;
