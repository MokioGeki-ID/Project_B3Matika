import { BookOpen, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

/**
 * MaterialCard - Display recommended topic/material
 * @param {Object} props
 * @param {number} props.topicId - Topic ID from TOPIK[id] format
 * @param {string} props.title - Topic title
 * @param {string} props.grade - Grade level (e.g., "Kelas 5")
 * @param {string} props.description - Short description
 */
export default function MaterialCard({ topicId, title, grade, description }) {
  return (
    <motion.div
      className="material-card"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.02 }}
    >
      <Link to={`/materi/${topicId}`} className="material-card-link">
        <div className="material-card-icon">
          <BookOpen size={24} strokeWidth={1.5} />
        </div>
        
        <div className="material-card-content">
          <div className="material-card-badge">{grade}</div>
          <h4 className="material-card-title">{title}</h4>
          {description && (
            <p className="material-card-description">{description}</p>
          )}
        </div>

        <div className="material-card-arrow">
          <ExternalLink size={16} />
        </div>
      </Link>
    </motion.div>
  );
}
