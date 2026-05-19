import { useState } from 'react';
import OnboardingChat from './components/onboarding/OnboardingChat';
import TeamReveal from './components/onboarding/TeamReveal';
import CompanionChat from './components/companion/CompanionChat';
import './App.css';

function Topbar() {
  return (
    <header className="topbar">
      <div className="topbar__logo">⚽ World<span>Cup</span> Companion</div>
      <div className="topbar__badge">2026</div>
    </header>
  );
}

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

  return (
    <div className="app-shell">
      <Topbar />
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
        {view === 'companion' && (
          <CompanionChat />
        )}
      </main>
    </div>
  );
}

export default App;
