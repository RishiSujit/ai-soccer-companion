import { useState, useEffect, useRef } from 'react';
import Dashboard from './components/Dashboard';
import LandingPage from './components/LandingPage';
import AuthScreen from './components/AuthScreen';
import OnboardingChat from './components/onboarding/OnboardingChat';
import TeamReveal from './components/onboarding/TeamReveal';
import HomeScreen from './components/HomeScreen';
import MatchSelector from './components/companion/MatchSelector';
import CompanionChat from './components/companion/CompanionChat';
import PredictionsGroupView from './components/PredictionsGroupView';
import { supabase } from './lib/supabase';
import './App.css';


function Topbar({ userName, userEmail, isGuest, onSignOut }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="topbar">
      <div className="topbar__logo">⚽ World<span>Cup</span> Companion</div>
      <div className="topbar__right" ref={ref}>
        {isGuest ? (
          <div className="topbar__user-label topbar__user-label--guest">Guest</div>
        ) : (
          <button
            className="topbar__user-btn"
            onClick={() => setOpen(o => !o)}
            aria-label="Account menu"
          >
            <div className="topbar__avatar">
              {userName ? userName[0].toUpperCase() : '?'}
            </div>
            <span className="topbar__user-name">{userName || userEmail || 'Account'}</span>
            <span className="topbar__chevron">{open ? '▲' : '▼'}</span>
          </button>
        )}
        {open && (
          <div className="topbar__dropdown">
            {userEmail && <div className="topbar__dropdown-email">{userEmail}</div>}
            <button className="topbar__dropdown-signout" onClick={() => { setOpen(false); onSignOut(); }}>
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

function NavTabs({ view, onTabChange }) {
  const tabs = [
    { id: 'home', label: 'Home' },
    { id: 'companion', label: 'Companion' },
    { id: 'predictions', label: 'Predictions' },
  ];
  return (
    <nav className="nav-tabs">
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`nav-tab ${view === tab.id ? 'nav-tab--active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}


const POST_ONBOARDING_VIEWS = ['home', 'companion', 'predictions'];

function App() {
  const [view, setView] = useState('landing');
  const [assignedTeam, setAssignedTeam] = useState(null);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [companionPreloadedQuestion, setCompanionPreloadedQuestion] = useState(null);
  const [userContext, setUserContext] = useState({
    team: null, knownSports: [], favoriteTeams: [], existingFan: false,
  });
  const [userId, setUserId] = useState(null);
  const [userName, setUserName] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState('signup');
  const [companionSource, setCompanionSource] = useState(null);

  useEffect(() => {
    async function initAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user && !session.user.is_anonymous) {
          const user = session.user;
          const meta = user.user_metadata || {};
          const displayName = meta.display_name || meta.first_name || user.email?.split('@')[0] || null;

          setUserId(user.id);
          setUserName(displayName);
          setUserEmail(user.email || null);
          setIsGuest(false);

          // Check Supabase for completed onboarding.
          // maybeSingle() returns null (no error) for 0 rows.
          // Only select columns guaranteed to exist in the schema.
          const { data: userData } = await supabase
            .from('users')
            .select('assigned_team, onboarding_complete, onboarding_answers')
            .eq('id', user.id)
            .maybeSingle();

          if (userData?.onboarding_complete && userData?.assigned_team) {
            const saved = userData.onboarding_answers || {};
            setUserContext({
              team: userData.assigned_team,
              knownSports: saved.knownSports || [],
              favoriteTeams: saved.favoriteTeams || [],
              existingFan: saved.existingFan || false,
              name: displayName,
            });
            setAssignedTeam({ team: userData.assigned_team, reasoning: '' });
            setAuthLoading(false);
            setView('home');
            return;
          }

          // Fallback: check localStorage
          const localContext = restoreTeamFromStorage(user.id);
          if (localContext) {
            setAuthLoading(false);
            setView('home');
            return;
          }

          // Authenticated but no onboarding yet
          setAuthLoading(false);
          setView('onboarding');
          return;
        }
      } catch {
        // fall through to anonymous sign-in
      }

      // No authenticated session — sign in anonymously and show landing
      try {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (!error && data?.user) {
          setUserId(data.user.id);
          setIsGuest(true);
        } else {
          setUserId('guest-' + Date.now());
          setIsGuest(true);
        }
      } catch {
        setUserId('guest-' + Date.now());
        setIsGuest(true);
      }
      setAuthLoading(false);
      // view stays 'landing' — guests start from the landing page
    }

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setUserId(null);
        setUserName(null);
        setUserEmail(null);
        setIsGuest(false);
        setAssignedTeam(null);
        setUserContext({ team: null, knownSports: [], favoriteTeams: [], existingFan: false });
        setView('landing');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  function restoreTeamFromStorage(uid) {
    try {
      const savedTeam = localStorage.getItem(`wcc_team_${uid}`);
      const savedContext = localStorage.getItem(`wcc_context_${uid}`);
      if (savedTeam && savedContext) {
        const parsedTeam = JSON.parse(savedTeam);
        const parsedContext = JSON.parse(savedContext);
        setAssignedTeam(parsedTeam);
        setUserContext(parsedContext);
        return parsedContext;
      }
    } catch {
      // Ignore corrupt storage
    }
    return null;
  }

  const handleAuthenticated = async (user) => {
    const meta = user.user_metadata || {};
    const displayName = meta.display_name || meta.first_name || user.email?.split('@')[0] || null;

    setUserId(user.id);
    setUserName(displayName);
    setUserEmail(user.email || null);
    setIsGuest(false);

    try {
      const { data: userData } = await supabase
        .from('users')
        .select('assigned_team, onboarding_complete, onboarding_answers')
        .eq('id', user.id)
        .maybeSingle();

      if (userData?.onboarding_complete && userData?.assigned_team) {
        const saved = userData.onboarding_answers || {};
        setUserContext({
          team: userData.assigned_team,
          knownSports: saved.knownSports || [],
          favoriteTeams: saved.favoriteTeams || [],
          existingFan: saved.existingFan || false,
          name: displayName,
        });
        setAssignedTeam({ team: userData.assigned_team, reasoning: '' });
        setView('home');
        return;
      }
    } catch {
      // fall through to localStorage check
    }

    // Fallback: check localStorage
    const localContext = restoreTeamFromStorage(user.id);
    if (localContext) {
      setView('home');
      return;
    }

    // Brand new user — go to onboarding
    setView('onboarding');
  };

  const handleGuest = async () => {
    try {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (!error && data?.user) {
        setUserId(data.user.id);
      } else {
        setUserId('guest-' + Date.now());
      }
    } catch {
      setUserId('guest-' + Date.now());
    }
    setIsGuest(true);
    setView('onboarding');
  };

  const handleSignOut = async () => {
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('wcc_'));
      keys.forEach(k => localStorage.removeItem(k));
      await supabase.auth.signOut();
    } catch {
      // onAuthStateChange handles the state reset
    }
  };

  const handleShowAuth = (mode) => {
    setAuthMode(mode || 'signup');
    setView('auth');
  };

  const handleTeamAssigned = async (data) => {
    const team = { team: data.team, reasoning: data.reasoning };
    const context = {
      team: data.team,
      knownSports: data.knownSports || [],
      favoriteTeams: data.favoriteTeams || [],
      existingFan: data.existingFan || false,
    };
    setAssignedTeam(team);
    setUserContext(context);

    if (userId && !isGuest) {
      // Persist to Supabase so returning users skip onboarding.
      // upsert (not update) so new users get a row created if one
      // doesn't exist yet — update silently does nothing on 0 rows.
      try {
        await supabase
          .from('users')
          .upsert({
            id: userId,
            assigned_team: data.team,
            onboarding_complete: true,
            onboarding_answers: {
              knownSports: data.knownSports || [],
              favoriteTeams: data.favoriteTeams || [],
              existingFan: data.existingFan || false,
            },
          }, { onConflict: 'id' });
      } catch (err) {
        console.error('Save team error:', err);
      }

      // localStorage as offline backup
      try {
        localStorage.setItem(`wcc_team_${userId}`, JSON.stringify(team));
        localStorage.setItem(`wcc_context_${userId}`, JSON.stringify(context));
      } catch {
        // Storage might be full or blocked
      }
    }

    setView('reveal');
  };

  const handleContinue = () => {
    setView('home');
  };

  const handleTabChange = (tabId) => {
    if (tabId === 'companion') {
      setSelectedMatch(null);
      setCompanionPreloadedQuestion(null);
    }
    setView(tabId);
  };

  const handleNavigate = (v, match) => {
    if (v === 'companion') {
      if (!match) {
        setSelectedMatch(null);
        setCompanionPreloadedQuestion(null);
        setCompanionSource(null);
      } else if (match?.general) {
        setSelectedMatch({ general: true });
        setCompanionPreloadedQuestion(match.preloadedQuestion || null);
        setCompanionSource(match.fromPredictions ? 'predictions' : null);
      } else {
        setSelectedMatch(match);
        setCompanionPreloadedQuestion(null);
        setCompanionSource(null);
      }
      setView('companion');
      return;
    }
    if (match) setSelectedMatch(match);
    setView(v);
  };

  if (window.location.pathname === '/dashboard') {
    return <Dashboard />;
  }

  if (authLoading) {
    return (
      <div style={{
        background: '#080810',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '12px',
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          background: '#7cfc8e',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
        }}>⚽</div>
        <div style={{
          fontSize: '12px',
          color: '#4444aa',
          fontWeight: '600',
        }}>Loading...</div>
      </div>
    );
  }

  if (view === 'landing') {
    return <LandingPage onShowAuth={handleShowAuth} />;
  }

  if (view === 'auth') {
    return (
      <AuthScreen
        initialMode={authMode}
        onAuthenticated={handleAuthenticated}
        onGuest={handleGuest}
      />
    );
  }

  const showNav = POST_ONBOARDING_VIEWS.includes(view);

  return (
    <div className="app-shell">
      <Topbar
        userName={userName}
        userEmail={userEmail}
        isGuest={isGuest}
        onSignOut={handleSignOut}
      />
      {showNav && <NavTabs view={view} onTabChange={handleTabChange} />}
      <main className="app-shell__content">
        {view === 'onboarding' && (
          <OnboardingChat onTeamAssigned={handleTeamAssigned} />
        )}
        {view === 'reveal' && (
          <TeamReveal
            team={assignedTeam.team}
            reasoning={assignedTeam.reasoning}
            knownSports={userContext.knownSports}
            existingFan={userContext.existingFan}
            onContinue={handleContinue}
          />
        )}
        {view === 'home' && (
          <HomeScreen
            userContext={userContext}
            userId={userId}
            onNavigate={handleNavigate}
          />
        )}
        {view === 'companion' && !selectedMatch && (
          <MatchSelector
            onMatchSelected={(m) => {
              if (m?.general) {
                setSelectedMatch({ general: true });
                setCompanionPreloadedQuestion(null);
              } else {
                setSelectedMatch(m);
              }
            }}
          />
        )}
        {view === 'companion' && selectedMatch && (
          <CompanionChat
            match={selectedMatch.general ? null : selectedMatch}
            userContext={userContext}
            userId={userId}
            preloadedQuestion={companionPreloadedQuestion}
            onBack={() => {
              setSelectedMatch(null);
              setCompanionPreloadedQuestion(null);
              setCompanionSource(null);
            }}
            onNavigateBack={companionSource === 'predictions' ? () => {
              setSelectedMatch(null);
              setCompanionPreloadedQuestion(null);
              setCompanionSource(null);
              setView('predictions');
            } : null}
          />
        )}
        {view === 'predictions' && (
          <PredictionsGroupView
            userId={userId}
            userName={userName}
            userContext={userContext}
            isGuest={isGuest}
            onShowAuth={(mode) => {
              setAuthMode(mode);
              setView('auth');
            }}
            onNavigate={handleNavigate}
          />
        )}
      </main>
    </div>
  );
}

export default App;
