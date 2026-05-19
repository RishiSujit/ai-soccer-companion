import { useState, useEffect, useRef } from 'react';
import { sendOnboardingMessage } from '../../services/api';

function OnboardingChat({ onTeamAssigned }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hey! I'm going to help you find your World Cup team. Tell me — what's your favorite sports team, and what do you love about them?" },
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
        onTeamAssigned({ team: data.team, reasoning: data.reasoning });
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

  return (
    <div className="onboarding-chat">
      <div className="onboarding-chat__messages">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`onboarding-chat__bubble onboarding-chat__bubble--${msg.role}`}
          >
            {msg.content}
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
          placeholder={isDone ? 'Team assigned!' : 'Type your answer...'}
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
