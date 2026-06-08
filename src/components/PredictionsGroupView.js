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
  const cacheKey = userId ? `wcc_groups_${userId}` : null;

  const [groups, setGroups] = useState(() => {
    if (!userId || isGuest) return [];
    try {
      const cached = localStorage.getItem(`wcc_groups_${userId}`);
      if (cached) return JSON.parse(cached);
      // Migrate from old single-group key
      const old = localStorage.getItem(`wcc_group_${userId}`);
      if (old) return [JSON.parse(old)];
    } catch {}
    return [];
  });

  const [leaderboards, setLeaderboards] = useState({});

  const [activeGroupId, setActiveGroupId] = useState(() => {
    if (!userId || isGuest) return null;
    try {
      const cached = localStorage.getItem(`wcc_groups_${userId}`);
      if (cached) return JSON.parse(cached)[0]?.id || null;
      const old = localStorage.getItem(`wcc_group_${userId}`);
      if (old) return JSON.parse(old).id;
    } catch {}
    return null;
  });

  const [groupPhase, setGroupPhase] = useState(() => {
    if (!userId || isGuest) return 'idle';
    try {
      const hasCache =
        localStorage.getItem(`wcc_groups_${userId}`) ||
        localStorage.getItem(`wcc_group_${userId}`);
      return hasCache ? 'joined' : 'loading';
    } catch { return 'loading'; }
  });

  const [groupName, setGroupName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [groupError, setGroupError] = useState(null);
  const [groupLoading, setGroupLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // Inline join/create state (shown inside the group panel when already in groups)
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [joinError, setJoinError] = useState('');

  const [celebration, setCelebration] = useState({ show: false, message: '', points: 0 });

  useEffect(() => {
    if (!userId || isGuest) {
      setGroupPhase('idle');
      return;
    }
    loadExistingGroups();
  }, [userId, isGuest]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && userId && !isGuest) {
        loadExistingGroups();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [userId, isGuest]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadExistingGroups() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setGroupPhase(p => p === 'loading' ? 'idle' : p);
        return;
      }

      const { data: memberships, error: memErr } = await supabase
        .from('group_members')
        .select('group_id, total_points')
        .eq('user_id', userId);

      if (memErr) {
        console.error('Membership query error:', memErr);
        setGroupPhase(p => p === 'loading' ? 'idle' : p);
        return;
      }

      if (!memberships?.length) {
        setGroups([]);
        setLeaderboards({});
        setGroupPhase('idle');
        try { localStorage.removeItem(cacheKey); } catch {}
        return;
      }

      // Fetch all group metadata in parallel
      const groupResults = await Promise.all(
        memberships.map(m =>
          supabase.from('groups').select('*').eq('id', m.group_id).maybeSingle()
        )
      );
      const loadedGroups = groupResults.map(r => r.data).filter(Boolean);

      setGroups(loadedGroups);
      setGroupPhase('joined');
      setActiveGroupId(prev =>
        prev && loadedGroups.some(g => g.id === prev) ? prev : loadedGroups[0]?.id || null
      );

      try {
        localStorage.setItem(cacheKey, JSON.stringify(
          loadedGroups.map(g => ({ id: g.id, name: g.name, invite_code: g.invite_code }))
        ));
      } catch {}

      for (const g of loadedGroups) loadLeaderboard(g.id);
    } catch (err) {
      console.error('Groups load error:', err);
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
      if (!error && data) {
        setLeaderboards(prev => ({ ...prev, [groupId]: data }));
      }
    } catch {}
  }

  function saveGroupsToCache(updatedGroups) {
    try {
      if (updatedGroups.length > 0) {
        localStorage.setItem(cacheKey, JSON.stringify(
          updatedGroups.map(g => ({ id: g.id, name: g.name, invite_code: g.invite_code }))
        ));
      } else {
        localStorage.removeItem(cacheKey);
      }
    } catch {}
  }

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
        const newGroup = data.group;
        const updated = [...groups, newGroup];
        setGroups(updated);
        saveGroupsToCache(updated);
        setActiveGroupId(newGroup.id);
        setGroupPhase('joined');
        setGroupName('');
        loadLeaderboard(newGroup.id);
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
        const newGroup = data.group;
        const alreadyIn = groups.some(g => g.id === newGroup.id);
        const updated = alreadyIn ? groups : [...groups, newGroup];
        setGroups(updated);
        saveGroupsToCache(updated);
        setActiveGroupId(newGroup.id);
        setGroupPhase('joined');
        setInviteCode('');
        setDisplayName('');
        loadLeaderboard(newGroup.id);
      }
    } catch {
      setGroupError('Failed to join group. Try again.');
    } finally {
      setGroupLoading(false);
    }
  }

  function handleCopyInvite(group) {
    navigator.clipboard.writeText(group.invite_code);
    setCopiedId(group.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleLeaveGroup(groupToLeave) {
    if (!window.confirm(`Leave "${groupToLeave.name}"?`)) return;
    try {
      await supabase
        .from('group_members')
        .delete()
        .eq('user_id', userId)
        .eq('group_id', groupToLeave.id);

      const updated = groups.filter(g => g.id !== groupToLeave.id);
      setGroups(updated);
      saveGroupsToCache(updated);

      setLeaderboards(prev => {
        const next = { ...prev };
        delete next[groupToLeave.id];
        return next;
      });

      if (updated.length === 0) {
        setGroupPhase('idle');
        setActiveGroupId(null);
      } else if (activeGroupId === groupToLeave.id) {
        setActiveGroupId(updated[0].id);
      }
    } catch {}
  }

  function cancelForm() {
    setGroupError(null);
    setGroupPhase(groups.length > 0 ? 'joined' : 'idle');
  }

  // Inline join from within the joined panel — no display name prompt, reuse existing
  async function handleJoinGroup() {
    if (!joinCode.trim()) return;
    setJoinError('');
    const myDisplayName = Object.values(leaderboards)
      .flat()
      .find(m => m.user_id === userId)?.display_name || userName || 'Fan';
    try {
      const data = await joinGroup(userId, joinCode.trim(), myDisplayName);
      if (data.error) {
        setJoinError(data.error || 'Invalid code — check and try again');
      } else {
        const newGroup = data.group;
        const alreadyIn = groups.some(g => g.id === newGroup.id);
        const updated = alreadyIn ? groups : [...groups, newGroup];
        setGroups(updated);
        saveGroupsToCache(updated);
        setActiveGroupId(newGroup.id);
        setShowJoinInput(false);
        setJoinCode('');
        loadLeaderboard(newGroup.id);
      }
    } catch {
      setJoinError('Something went wrong — try again');
    }
  }

  // Inline create from within the joined panel
  async function handleCreateGroup() {
    if (!newGroupName.trim()) return;
    try {
      const data = await createGroup(userId, newGroupName.trim());
      if (data.error) {
        setJoinError(data.error);
      } else {
        const newGroup = data.group;
        const updated = [...groups, newGroup];
        setGroups(updated);
        saveGroupsToCache(updated);
        setActiveGroupId(newGroup.id);
        setShowCreateInput(false);
        setNewGroupName('');
        loadLeaderboard(newGroup.id);
      }
    } catch {
      setJoinError('Failed to create group — try again');
    }
  }

  const activeGroup = groups.find(g => g.id === activeGroupId);
  const activeLeaderboard = activeGroupId ? (leaderboards[activeGroupId] || []) : [];

  return (
    <div className="predictions-page">
      <CelebrationOverlay
        show={celebration.show}
        message={celebration.message}
        points={celebration.points}
        onDismiss={() => setCelebration(prev => ({ ...prev, show: false }))}
      />

      {/* ── Page header ──────────────────────────────────── */}
      <div className="predictions-header">
        <div>
          <div className="predictions-title">Predictions</div>
          <div className="predictions-subtitle">Daily card · Compete with your group</div>
        </div>
        <div className="predictions-header-right">
          {groupPhase !== 'joined' && (
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
            <div className="pgv-loading">Loading groups...</div>
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
              <button className="group-form__cancel" type="button" onClick={cancelForm}>
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
              <button className="group-form__cancel" type="button" onClick={cancelForm}>
                Cancel
              </button>
            </form>
          )}

          {groupPhase === 'joined' && groups.length > 0 && (
            <div className="group-joined">

              {/* Group tabs */}
              <div className="group-tabs">
                {groups.map(g => (
                  <button
                    key={g.id}
                    className={`group-tab ${activeGroupId === g.id ? 'group-tab--active' : ''}`}
                    onClick={() => setActiveGroupId(g.id)}
                  >
                    {g.name}
                  </button>
                ))}
              </div>

              {activeGroup && (
                <>
                  <div className="invite-bar">
                    <div>
                      <div className="invite-label">INVITE CODE</div>
                      <div className="invite-code-display">{activeGroup.invite_code}</div>
                    </div>
                    <div className="copy-btn" onClick={() => handleCopyInvite(activeGroup)}>
                      {copiedId === activeGroup.id ? 'Copied!' : 'Copy code'}
                    </div>
                  </div>

                  <div className="leaderboard-section">
                    <div className="lb-section-title">
                      Leaderboard
                      {activeLeaderboard.length > 0 && (
                        <span className="lb-member-count">
                          {activeLeaderboard.length} member{activeLeaderboard.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    {activeLeaderboard.length === 0 ? (
                      <div className="lb-empty">No predictions locked in yet. Be the first!</div>
                    ) : (
                      activeLeaderboard.map((member, index) => (
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

                  <div className="leave-group" onClick={() => handleLeaveGroup(activeGroup)}>
                    Leave {activeGroup.name}
                  </div>

                  {/* ── Inline join / create another group ── */}
                  <div className="add-group-section">
                    <div className="add-group-divider"><span>join or create another</span></div>

                    {showJoinInput ? (
                      <div className="join-inline-form">
                        <input
                          type="text"
                          className="join-inline-input"
                          placeholder="Invite code (e.g. ABC123)"
                          value={joinCode}
                          onChange={e => setJoinCode(e.target.value.toUpperCase())}
                          maxLength={8}
                          autoFocus
                        />
                        <div className="join-inline-actions">
                          <button
                            className="join-inline-submit"
                            onClick={handleJoinGroup}
                            disabled={joinCode.length < 4}
                          >Join</button>
                          <button
                            className="join-inline-cancel"
                            onClick={() => { setShowJoinInput(false); setJoinCode(''); setJoinError(''); }}
                          >Cancel</button>
                        </div>
                        {joinError && <div className="join-inline-error">{joinError}</div>}
                      </div>
                    ) : (
                      <button className="add-group-btn" onClick={() => { setShowJoinInput(true); setShowCreateInput(false); }}>
                        → Join another group
                      </button>
                    )}

                    {showCreateInput ? (
                      <div className="join-inline-form">
                        <input
                          type="text"
                          className="join-inline-input"
                          placeholder="New group name"
                          value={newGroupName}
                          onChange={e => setNewGroupName(e.target.value)}
                          maxLength={30}
                          autoFocus
                        />
                        <div className="join-inline-actions">
                          <button
                            className="join-inline-submit"
                            onClick={handleCreateGroup}
                            disabled={newGroupName.length < 2}
                          >Create</button>
                          <button
                            className="join-inline-cancel"
                            onClick={() => { setShowCreateInput(false); setNewGroupName(''); setJoinError(''); }}
                          >Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button className="add-group-btn secondary" onClick={() => { setShowCreateInput(true); setShowJoinInput(false); }}>
                        + Create a new group
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PredictionsGroupView;
