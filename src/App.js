import { useState } from 'react';
import OnboardingChat from './components/onboarding/OnboardingChat';
import TeamReveal from './components/onboarding/TeamReveal';
import CompanionChat from './components/companion/CompanionChat';
import PredictionCard from './components/predictions/PredictionCard';
import PropBetCard from './components/predictions/PropBetCard';
import LockButton from './components/predictions/LockButton';
import { submitPrediction } from './services/api';
import './App.css';

const HARDCODED_MATCH = {
  matchId: 'test-match-1',
  homeTeam: 'USA',
  awayTeam: 'Mexico',
  kickoff_time: '2026-06-22T20:00:00Z',
  props: [
    { id: 'prop-1', question: 'Will there be a red card?', options: ['Yes', 'No'] },
    { id: 'prop-2', question: 'First goal scorer nationality?', options: ['USA', 'Mexico', 'No goal'] },
  ],
};

function Topbar() {
  return (
    <header className="topbar">
      <div className="topbar__logo">⚽ World<span>Cup</span> Companion</div>
      <div className="topbar__badge">2026</div>
    </header>
  );
}

function NavTabs({ view, setView }) {
  const tabs = [
    { id: 'companion', label: 'Companion' },
    { id: 'predictions', label: 'Predictions' },
    { id: 'group', label: 'Group' },
  ];
  return (
    <nav className="nav-tabs">
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`nav-tab ${view === tab.id ? 'nav-tab--active' : ''}`}
          onClick={() => setView(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}

function PredictionsView() {
  const [resultPrediction, setResultPrediction] = useState(null);
  const [propPredictions, setPropPredictions] = useState({});
  const [locked, setLocked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isPastKickoff = Date.now() >= new Date(HARDCODED_MATCH.kickoff_time).getTime();

  const handlePropSelect = (propId, value) => {
    setPropPredictions(prev => ({ ...prev, [propId]: value }));
  };

  const handleLock = async () => {
    setIsSubmitting(true);
    try {
      await submitPrediction(
        'test-user-1',
        HARDCODED_MATCH.matchId,
        resultPrediction,
        propPredictions,
      );
      setLocked(true);
    } catch {
      // Fail silently — LockButton stays unlocked so Sam can retry
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="predictions-view">
      <PredictionCard
        match={HARDCODED_MATCH}
        selected={resultPrediction}
        onSelect={setResultPrediction}
        isPastKickoff={isPastKickoff}
        locked={locked}
      />
      {HARDCODED_MATCH.props.map(prop => (
        <PropBetCard
          key={prop.id}
          prop={prop}
          selected={propPredictions[prop.id] ?? null}
          onSelect={(value) => handlePropSelect(prop.id, value)}
          isPastKickoff={isPastKickoff}
          locked={locked}
        />
      ))}
      <LockButton
        onLock={handleLock}
        disabled={!resultPrediction || isPastKickoff}
        locked={locked}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}

const POST_ONBOARDING_VIEWS = ['companion', 'predictions', 'group'];

function App() {
  const [view, setView] = useState('companion');
  const [assignedTeam, setAssignedTeam] = useState(null);

  const handleTeamAssigned = ({ team, reasoning }) => {
    setAssignedTeam({ team, reasoning });
    setView('reveal');
  };

  const handleContinue = () => {
    setView('companion');
  };

  const showNav = POST_ONBOARDING_VIEWS.includes(view);

  return (
    <div className="app-shell">
      <Topbar />
      {showNav && <NavTabs view={view} setView={setView} />}
      <main className="app-shell__content">
        {view === 'onboarding' && (
          <OnboardingChat onTeamAssigned={handleTeamAssigned} />
        )}
        {view === 'reveal' && (
          <TeamReveal
            team={assignedTeam.team}
            reasoning={assignedTeam.reasoning}
            onContinue={handleContinue}
          />
        )}
        {view === 'companion' && <CompanionChat />}
        {view === 'predictions' && <PredictionsView />}
        {view === 'group' && (
          <div className="placeholder">
            <h2>Group coming soon</h2>
            <p>Create or join a group to compete with friends.</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
