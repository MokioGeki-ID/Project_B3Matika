import { Lightbulb, BookOpen, MessageCircle, Puzzle } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * WelcomeState - Welcome screen for new conversation
 * @param {Object} props
 * @param {Object} props.user - User object
 * @param {Function} props.onSuggestionClick - Callback when suggestion is clicked
 */
export default function WelcomeState({ user, onSuggestionClick }) {
  // Get greeting based on time of day (WIB = UTC+7)
  const getGreeting = () => {
    const now = new Date();
    const wibHour = (now.getUTCHours() + 7) % 24;
    
    if (wibHour >= 5 && wibHour < 11) return 'Selamat pagi';
    if (wibHour >= 11 && wibHour < 15) return 'Selamat siang';
    if (wibHour >= 15 && wibHour < 19) return 'Selamat sore';
    return 'Selamat malam';
  };

  // Get first name from user
  const getFirstName = () => {
    if (!user?.name) return '';
    return user.name.split(' ')[0];
  };

  const greeting = getGreeting();
  const firstName = getFirstName();

  const suggestions = [
    {
      icon: Lightbulb,
      text: 'Jelaskan konsep pecahan dengan contoh sehari-hari',
    },
    {
      icon: BookOpen,
      text: 'Beri saya 5 soal latihan aljabar beserta pembahasan',
    },
    {
      icon: MessageCircle,
      text: 'Bantu saya menyelesaikan soal ini langkah demi langkah',
    },
    {
      icon: Puzzle,
      text: 'Ajak saya bermain teka-teki logika',
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      className="welcome-state"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <div className="welcome-state-content">
        {/* Logo */}
        <motion.div className="welcome-state-logo" variants={itemVariants}>
          <img
            src="/images/ai-tutor-mascot.jpg"
            alt="AI Tutor B3Matika"
            className="tutor-mascot-img"
            width={64}
            height={64}
            style={{ borderRadius: '16px' }}
          />
        </motion.div>

        {/* Greeting */}
        <motion.h1 className="welcome-state-greeting" variants={itemVariants}>
          {greeting}
          {firstName && <span className="welcome-state-name">, {firstName}</span>}
        </motion.h1>

        {/* Title */}
        <motion.h2 className="welcome-state-title" variants={itemVariants}>
          Apa yang ingin kamu pelajari hari ini?
        </motion.h2>

        {/* Subtitle */}
        <motion.p className="welcome-state-subtitle" variants={itemVariants}>
          Tanyakan konsep, minta latihan soal, atau selesaikan soal bersama langkah demi langkah.
        </motion.p>

        {/* Suggestion Cards */}
        <motion.div className="welcome-state-suggestions" variants={itemVariants}>
          {suggestions.map((suggestion, index) => {
            const Icon = suggestion.icon;
            return (
              <motion.button
                key={index}
                className="welcome-suggestion-card"
                onClick={() => onSuggestionClick(suggestion.text)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.15 }}
              >
                <div className="suggestion-card-icon">
                  <Icon size={20} strokeWidth={1.5} />
                </div>
                <div className="suggestion-card-text">{suggestion.text}</div>
              </motion.button>
            );
          })}
        </motion.div>
      </div>
    </motion.div>
  );
}
