// TODO: Phase 4 — individual chat message bubble
function MessageBubble({ role, content }) {
  return <div className={`bubble bubble--${role}`}>{content}</div>;
}

export default MessageBubble;
