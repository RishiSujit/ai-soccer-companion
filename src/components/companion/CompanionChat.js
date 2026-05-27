import { useState, useEffect, useRef } from 'react';
import { sendCompanionMessage } from '../../services/api';
import RatingButtons from './RatingButtons';
import FormationPitch from './FormationPitch';
import LineupList from './LineupList';

const FLAGS = {
  'Argentina':'🇦🇷','France':'🇫🇷','Brazil':'🇧🇷',
  'England':'🏴󠁧󠁢󠁥󠁮󠁧󠁿','Germany':'🇩🇪','Spain':'🇪🇸',
  'USA':'🇺🇸','Mexico':'🇲🇽','Portugal':'🇵🇹',
  'Netherlands':'🇳🇱','Italy':'🇮🇹','Japan':'🇯🇵',
  'Morocco':'🇲🇦','Senegal':'🇸🇳','Australia':'🇦🇺',
  'Croatia':'🇭🇷','Uruguay':'🇺🇾','Colombia':'🇨🇴',
};

const OPENING_MESSAGE = "I'm your match companion for this game. Ask me anything — rules, players, what just happened. I'll explain it in plain English.";

// Extracted so both desktop and mobile can each mount their own scroll ref
function ChatPanel({
  messages, isLoading, input, setInput, onSend, onKeyDown, onRate,
  followUps, showFollowUps, onFollowUpTap, onDismissFollowUps,
}) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, showFollowUps]);

  return (
    <div className="chat-panel">
      <div className="split-chat-feed">
        {messages.map((msg, i) => (
          <div
            key={i}
            className="companion-message"
            style={{ animation: 'slideUp 0.3s ease forwards' }}
          >
            {msg.role === 'assistant' && (
              <div className="msg-sender-label">
                <div className="ai-avatar">AI</div>
                <span>Companion</span>
              </div>
            )}
            <div className={`onboarding-chat__bubble onboarding-chat__bubble--${msg.role}`}>
              {msg.content}
            </div>
            {msg.role === 'assistant' && (
              <RatingButtons onRate={(rating) => onRate(i, rating)} rated={msg.rated} />
            )}
          </div>
        ))}
        {isLoading && (
          <div className="onboarding-chat__bubble onboarding-chat__bubble--assistant onboarding-chat__bubble--loading">
            <span className="onboarding-chat__dots">
              <span>.</span><span>.</span><span>.</span>
            </span>
          </div>
        )}
        {showFollowUps && followUps.length > 0 && (
          <div className="follow-ups-container">
            <div className="follow-ups-pills">
              {followUps.map((q, i) => (
                <button
                  key={i}
                  className="follow-up-pill"
                  onClick={() => onFollowUpTap(q)}
                >
                  {q}
                </button>
              ))}
            </div>
            <button className="follow-up-dismiss" onClick={onDismissFollowUps} aria-label="Dismiss">
              ×
            </button>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="split-chat-input">
        <input
          className="onboarding-chat__input"
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask anything..."
          disabled={isLoading}
        />
        <button
          className="onboarding-chat__send"
          onClick={onSend}
          disabled={isLoading || !input.trim()}
        />
      </div>
    </div>
  );
}

function CompanionChat({ match, userContext, userId, onBack }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: OPENING_MESSAGE, rated: null },
  ]);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mobileTab, setMobileTab] = useState('formation');
  const [followUps, setFollowUps] = useState([]);
  const [showFollowUps, setShowFollowUps] = useState(false);

  const sendMessage = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    setFollowUps([]);
    setShowFollowUps(false);
    setMessages(prev => [...prev, { role: 'user', content: trimmed, rated: null }]);
    setInput('');
    setIsLoading(true);

    const updatedHistory = [...conversationHistory, { role: 'user', content: trimmed }];

    try {
      const data = await sendCompanionMessage(trimmed, conversationHistory, match, userContext);
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply, rated: null }]);
      setConversationHistory([...updatedHistory, { role: 'assistant', content: data.reply }]);
      if (data.followUps && data.followUps.length > 0) {
        setFollowUps(data.followUps);
        setShowFollowUps(true);
      }
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: "Sorry, something went wrong. Try again?", rated: null },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = () => sendMessage(input);

  const handleFollowUpTap = (question) => {
    setShowFollowUps(false);
    sendMessage(question);
  };

  const handleDismissFollowUps = () => {
    setShowFollowUps(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleRate = (index, rating) => {
    setMessages(prev =>
      prev.map((msg, i) => (i === index ? { ...msg, rated: rating } : msg))
    );
  };

  const chatProps = {
    messages, isLoading, input, setInput,
    onSend: handleSend, onKeyDown: handleKeyDown, onRate: handleRate,
    followUps, showFollowUps, onFollowUpTap: handleFollowUpTap,
    onDismissFollowUps: handleDismissFollowUps,
  };

  return (
    <div className="companion-chat">

      {/* ── Match hero header ──────────────────────────────── */}
      <div className="companion-hero">
        <div className="hero-top-row">
          <button className="back-btn" onClick={onBack}>← Matches</button>
          <div className="hero-stage-tag">
            <div className="live-indicator" />
            {match.stage}{match.minute ? ` · ${match.minute}'` : ''}
          </div>
          <div className="hero-minute-badge">
            {match.minute ? `${match.minute}'` : match.status}
          </div>
        </div>
        <div className="hero-score-row">
          <div className="hero-team">
            <div className="hero-flag">{FLAGS[match.homeTeam] ?? '🌍'}</div>
            <div className="hero-name">{match.homeTeam}</div>
          </div>
          <div className="hero-scores">
            <span className="hero-score-n">{match.homeScore ?? '–'}</span>
            <span className="hero-score-div">–</span>
            <span className="hero-score-n">{match.awayScore ?? '–'}</span>
          </div>
          <div className="hero-team">
            <div className="hero-flag">{FLAGS[match.awayTeam] ?? '🌍'}</div>
            <div className="hero-name">{match.awayTeam}</div>
          </div>
        </div>
      </div>

      {/* ── Desktop split layout (≥768px) ─────────────────── */}
      <div className="companion-split">
        <div className="split-left">
          <div className="split-panel-header">
            <div className="split-panel-title">Live formation</div>
            <div className="split-panel-tabs">
              <button
                className={mobileTab !== 'lineup' ? 'active' : ''}
                onClick={() => setMobileTab('formation')}
              >
                Pitch
              </button>
              <button
                className={mobileTab === 'lineup' ? 'active' : ''}
                onClick={() => setMobileTab('lineup')}
              >
                Lineup
              </button>
            </div>
          </div>
          <div className="split-left-content">
            {mobileTab === 'lineup'
              ? <LineupList {...match} userContext={userContext} />
              : <FormationPitch {...match} userContext={userContext} />}
          </div>
        </div>
        <div className="split-right">
          <div className="split-panel-header">
            <div className="split-panel-title">AI Companion</div>
            <div style={{ fontSize: '9px', color: '#4444aa' }}>Ask anything</div>
          </div>
          <ChatPanel {...chatProps} />
        </div>
      </div>

      {/* ── Mobile tabbed layout (<768px) ─────────────────── */}
      <div className="companion-mobile">
        <div className="mobile-panel-tabs">
          <div
            className={`mobile-tab ${mobileTab === 'formation' ? 'active' : ''}`}
            onClick={() => setMobileTab('formation')}
          >
            Formation
          </div>
          <div
            className={`mobile-tab ${mobileTab === 'lineup' ? 'active' : ''}`}
            onClick={() => setMobileTab('lineup')}
          >
            Lineup
          </div>
          <div
            className={`mobile-tab ${mobileTab === 'chat' ? 'active' : ''}`}
            onClick={() => setMobileTab('chat')}
          >
            Chat
          </div>
        </div>
        <div className="mobile-panel-content">
          {mobileTab === 'formation' && (
            <div className="mobile-panel-scroll"><FormationPitch {...match} userContext={userContext} /></div>
          )}
          {mobileTab === 'lineup' && (
            <div className="mobile-panel-scroll"><LineupList {...match} userContext={userContext} /></div>
          )}
          {mobileTab === 'chat' && <ChatPanel {...chatProps} />}
        </div>
      </div>

    </div>
  );
}

export default CompanionChat;
