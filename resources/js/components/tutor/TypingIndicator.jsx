import { Bot } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * TypingIndicator - Show when AI is generating response
 */
export default function TypingIndicator() {
  return (
    <motion.div 
      className="message-bubble message-ai typing"
      initial={{ opacity: 0, y: 10, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      transition={{ duration: 0.3 }}
    >
      <div className="message-avatar avatar-ai">
        <Bot size={20} />
      </div>
      
      <div className="message-content">
        <div className="typing-dots">
          <span />
          <span />
          <span />
        </div>
      </div>
    </motion.div>
  );
}
