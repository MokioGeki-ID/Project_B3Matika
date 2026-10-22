/**
 * Session Storage Utilities
 * Safe wrappers for sessionStorage operations (SSR-safe, error-handled)
 */

const isAvailable = () => {
  if (typeof window === 'undefined') return false;
  
  try {
    const test = '__storage_test__';
    window.sessionStorage.setItem(test, test);
    window.sessionStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Get item from sessionStorage
 * @param {string} key - Storage key
 * @param {*} defaultValue - Default value if key doesn't exist
 * @returns {*} Parsed value or default value
 */
export const getSessionItem = (key, defaultValue = null) => {
  if (!isAvailable()) return defaultValue;
  
  try {
    const item = window.sessionStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.warn(`Failed to get sessionStorage item "${key}":`, e);
    return defaultValue;
  }
};

/**
 * Set item in sessionStorage
 * @param {string} key - Storage key
 * @param {*} value - Value to store (will be JSON stringified)
 * @returns {boolean} Success status
 */
export const setSessionItem = (key, value) => {
  if (!isAvailable()) return false;
  
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.warn(`Failed to set sessionStorage item "${key}":`, e);
    return false;
  }
};

/**
 * Remove item from sessionStorage
 * @param {string} key - Storage key
 * @returns {boolean} Success status
 */
export const removeSessionItem = (key) => {
  if (!isAvailable()) return false;
  
  try {
    window.sessionStorage.removeItem(key);
    return true;
  } catch (e) {
    console.warn(`Failed to remove sessionStorage item "${key}":`, e);
    return false;
  }
};

/**
 * Clear all sessionStorage items
 * @returns {boolean} Success status
 */
export const clearSession = () => {
  if (!isAvailable()) return false;
  
  try {
    window.sessionStorage.clear();
    return true;
  } catch (e) {
    console.warn('Failed to clear sessionStorage:', e);
    return false;
  }
};

/**
 * Get storage key for active conversation (user-specific)
 * @param {string} userId - User ID
 * @returns {string} Storage key
 */
export const getActiveConversationKey = (userId) => {
  return `b3m_tutor_active:${userId}`;
};

/**
 * Get storage key for draft input (user-specific)
 * @param {string} userId - User ID
 * @returns {string} Storage key
 */
export const getDraftInputKey = (userId) => {
  return `b3m_tutor_draft_input:${userId}`;
};

/**
 * Check if current state is a new draft (not saved to DB yet)
 * @param {string} userId - User ID
 * @returns {boolean} Is draft state
 */
export const isDraftState = (userId) => {
  return getSessionItem(getActiveConversationKey(userId)) === 'draft';
};

/**
 * Set draft state (new conversation not yet saved)
 * @param {string} userId - User ID
 * @returns {boolean} Success status
 */
export const setDraftState = (userId) => {
  return setSessionItem(getActiveConversationKey(userId), 'draft');
};

/**
 * Save active conversation ID
 * @param {string} userId - User ID
 * @param {string} conversationId - Conversation ID
 * @returns {boolean} Success status
 */
export const saveActiveConversation = (userId, conversationId) => {
  return setSessionItem(getActiveConversationKey(userId), conversationId);
};

/**
 * Get active conversation ID
 * @param {string} userId - User ID
 * @returns {string|null} Conversation ID or 'draft' or null
 */
export const getActiveConversation = (userId) => {
  return getSessionItem(getActiveConversationKey(userId));
};

/**
 * Clear active conversation
 * @param {string} userId - User ID
 * @returns {boolean} Success status
 */
export const clearActiveConversation = (userId) => {
  return removeSessionItem(getActiveConversationKey(userId));
};

/**
 * Save draft input text
 * @param {string} userId - User ID
 * @param {string} text - Draft text
 * @returns {boolean} Success status
 */
export const saveDraftInput = (userId, text) => {
  return setSessionItem(getDraftInputKey(userId), text);
};

/**
 * Get draft input text
 * @param {string} userId - User ID
 * @returns {string} Draft text or empty string
 */
export const getDraftInput = (userId) => {
  return getSessionItem(getDraftInputKey(userId), '');
};

/**
 * Clear draft input
 * @param {string} userId - User ID
 * @returns {boolean} Success status
 */
export const clearDraftInput = (userId) => {
  return removeSessionItem(getDraftInputKey(userId));
};

/**
 * Clear all tutor-related session data for a user
 * @param {string} userId - User ID
 * @returns {boolean} Success status
 */
export const clearTutorSession = (userId) => {
  clearActiveConversation(userId);
  clearDraftInput(userId);
  return true;
};
