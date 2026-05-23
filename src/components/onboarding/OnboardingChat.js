import { useState, useEffect, useRef } from 'react';
import { sendOnboardingMessage } from '../../services/api';

function OnboardingChat({ onTeamAssigned }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hey! Welcome to World Cup Companion. Quick question — do you already have a favorite soccer team, or are you starting fresh? ⚽" },
  ]);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading || isDone) return;

    const userMessage = { role: 'user', content: trimmed };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const updatedHistory = [...conversationHistory, { role: 'user', content: trimmed }];

    try {
      const data = await sendOnboardingMessage(trimmed, conversationHistory);

      if (data.action === 'assign_team') {
        setIsDone(true);
        onTeamAssigned({
          team: data.team,
          reasoning: data.reasoning,
          knownSports: data.knownSports || [],
          favoriteTeams: data.favoriteTeams || [],
          existingFan: data.existingFan || false,
        });
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
        setConversationHistory([...updatedHistory, { role: 'assistant', content: data.reply }]);
      }
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: "Sorry, something went wrong. Try again?" },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const userMessageCount = messages.filter(m => m.role === 'user').length;

  return (
    <div className="onboarding-chat">
      <div className="onboard-progress-header">
        <span className="onboard-progress-label">
          Finding your team · Step {Math.min(userMessageCount + 1, 3)} of 3
        </span>
        <div className="onboard-progress-bar">
          <div
            className="onboard-progress-fill"
            style={{ width: `${Math.min((userMessageCount / 3) * 100, 100)}%` }}
          />
        </div>
      </div>

      <div className="onboarding-chat__messages">
        {messages.map((msg, i) => (
          <div
            key={i}
            className="onboard-msg"
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
          </div>
        ))}
        {isLoading && (
          <div className="onboarding-chat__bubble onboarding-chat__bubble--assistant onboarding-chat__bubble--loading">
            <span className="onboarding-chat__dots">
              <span>.</span><span>.</span><span>.</span>
            </span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="onboarding-chat__input-row">
        <input
          className="onboarding-chat__input"
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isDone ? 'Team assigned!' : 'Tell me about your favorite team...'}
          disabled={isLoading || isDone}
        />
        <button
          className="onboarding-chat__send"
          onClick={handleSend}
          disabled={isLoading || isDone || !input.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default OnboardingChat;
