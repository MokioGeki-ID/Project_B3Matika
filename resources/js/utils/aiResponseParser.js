/**
 * Parse AI response to extract TOPIK[id] and video codes
 * @param {string} text - AI response text
 * @returns {Object} - {topicIds: number[], videoCodes: string[], cleanText: string}
 */
export function parseAIResponse(text) {
  // Extract topic IDs from TOPIK[id] format
  const topicRegex = /TOPIK\[(\d+)\]/g;
  const topicMatches = [...text.matchAll(topicRegex)];
  const topicIds = topicMatches.map(match => parseInt(match[1], 10));

  // Extract video codes (V1, V2, etc) - case insensitive
  const videoRegex = /\b(V\d+)\b/gi;
  const videoMatches = [...text.matchAll(videoRegex)];
  const videoCodes = videoMatches.map(match => match[1].toUpperCase());

  return {
    topicIds: [...new Set(topicIds)], // Remove duplicates
    videoCodes: [...new Set(videoCodes)],
    cleanText: text
  };
}

/**
 * Check if text contains recommendations
 * @param {string} text - Text to check
 * @returns {boolean}
 */
export function hasRecommendations(text) {
  return /TOPIK\[\d+\]/i.test(text) || /\bV\d+\b/i.test(text);
}

/**
 * Highlight TOPIK[id] and video codes in text for better visibility
 * @param {string} text - Text to highlight
 * @returns {string} - Text with markdown bold applied
 */
export function highlightRecommendations(text) {
  // Bold TOPIK[id]
  let highlighted = text.replace(/TOPIK\[(\d+)\]/g, '**TOPIK[$1]**');
  
  // Bold video codes
  highlighted = highlighted.replace(/\b(V\d+)\b/g, '**$1**');
  
  return highlighted;
}
