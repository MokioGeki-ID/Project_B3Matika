import { useState, useEffect } from 'react';
import { ArrowDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * ScrollToBottom - Floating button untuk scroll ke bawah
 * @param {Object} props
 * @param {Function} props.onClick - Callback saat button diklik
 * @param {React.RefObject} props.containerRef - Ref ke scroll container
 * @param {number} props.threshold - Threshold untuk show button (default: 200px dari bottom)
 */
export default function ScrollToBottom({ 
  onClick, 
  containerRef,
  threshold = 200 
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const container = containerRef?.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      
      setIsVisible(distanceFromBottom > threshold);
    };

    container.addEventListener('scroll', handleScroll);
    handleScroll(); // Check initial state

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [containerRef, threshold]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          className="scroll-to-bottom-btn"
          onClick={onClick}
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.8 }}
          transition={{ duration: 0.2 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Gulir ke bawah"
          title="Gulir ke bawah"
        >
          <ArrowDown size={20} />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
