/**
 * titleGenerator.js
 * Utility untuk generate judul percakapan otomatis berdasarkan pesan user pertama
 */

import env from './env.js';

/**
 * Sanitasi judul hasil AI
 * - Hapus quotes di awal/akhir
 * - Hapus emoji
 * - Trim whitespace
 * - Potong di 40 karakter di batas kata
 * - Huruf kapital hanya di awal
 * 
 * @param {string} text - Teks hasil AI
 * @returns {string} Judul yang sudah disanitasi
 */
function sanitizeTitle(text) {
  if (!text || typeof text !== 'string') {
    return 'Percakapan Baru';
  }

  // Hapus quotes di awal dan akhir
  let cleaned = text.trim().replace(/^["']|["']$/g, '');
  
  // Hapus emoji (regex untuk emoji Unicode)
  cleaned = cleaned.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
  
  // Hapus multiple spaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  // Hapus titik di akhir
  cleaned = cleaned.replace(/\.+$/, '');
  
  // Potong di 40 karakter di batas kata
  if (cleaned.length > 40) {
    cleaned = cleaned.substring(0, 40);
    
    // Potong di batas kata terakhir
    const lastSpace = cleaned.lastIndexOf(' ');
    if (lastSpace > 20) { // Minimal 20 karakter
      cleaned = cleaned.substring(0, lastSpace);
    }
    
    // Hapus punctuation di akhir setelah potong
    cleaned = cleaned.replace(/[,;:!?.-]+$/, '');
  }
  
  // Huruf kapital hanya di awal kalimat
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
  }
  
  return cleaned || 'Percakapan Baru';
}

/**
 * Generate fallback title dari pesan user (jika AI gagal)
 * 
 * @param {string} userMessage - Pesan user pertama
 * @returns {string} Judul fallback
 */
function generateFallbackTitle(userMessage) {
  if (!userMessage || typeof userMessage !== 'string') {
    return 'Percakapan Baru';
  }

  // Bersihkan dan potong pesan user
  let title = userMessage.trim();
  
  // Hapus newlines
  title = title.replace(/\n+/g, ' ');
  
  // Hapus multiple spaces
  title = title.replace(/\s+/g, ' ');
  
  // Potong di 40 karakter di batas kata
  if (title.length > 40) {
    title = title.substring(0, 40);
    const lastSpace = title.lastIndexOf(' ');
    if (lastSpace > 20) {
      title = title.substring(0, lastSpace);
    }
  }
  
  return sanitizeTitle(title);
}

/**
 * Generate judul percakapan menggunakan AI
 * 
 * @param {string} userMessage - Pesan user pertama
 * @param {string} tone - Tone percakapan ('baku' atau 'santai')
 * @returns {Promise<string>} Judul hasil generate
 */
export async function generateConversationTitle(userMessage, tone = 'baku') {
  try {
    // Validation
    if (!userMessage || typeof userMessage !== 'string' || userMessage.trim().length === 0) {
      return 'Percakapan Baru';
    }

    // Check API key
    const apiKeyStr = env.GEMINI_API_KEY || '';
    const apiKeys = apiKeyStr.split(',').map(k => k.replace(/['"]/g, '').trim()).filter(k => k);
    
    if (apiKeys.length === 0) {
      console.warn('No API keys available for title generation');
      return generateFallbackTitle(userMessage);
    }

    // Import Gemini SDK
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const modelName = env.GEMINI_MODEL || 'gemini-3.8-flash'; // Use same model as chat
    
    // Build prompt untuk generate title
    const toneInstruction = tone === 'santai' 
      ? 'gunakan bahasa yang santai dan ramah' 
      : 'gunakan bahasa baku yang formal';
    
    const prompt = `Buatkan judul singkat (2-6 kata, maksimal 40 karakter) dalam Bahasa Indonesia yang merangkum INTI pertanyaan atau topik dari pesan user berikut. ${toneInstruction}.

ATURAN:
- Tanpa tanda kutip
- Tanpa emoji
- Tanpa titik di akhir
- Huruf kapital hanya di awal kalimat
- Fokus pada topik utama, bukan detail
- Jika tentang matematika, sebutkan topiknya (contoh: "Cara menghitung luas lingkaran")

PESAN USER:
${userMessage}

JUDUL:`;

    // Try API keys
    let lastError = null;
    
    for (const apiKey of apiKeys) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature: 0.3, // Lower temperature untuk konsistensi
            maxOutputTokens: 20, // Judul pendek
          },
        });

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        
        if (text && text.trim()) {
          const title = sanitizeTitle(text);
          
          // Validasi panjang
          if (title.length >= 1 && title.length <= 80) {
            return title;
          }
        }
        
      } catch (err) {
        lastError = err;
        console.error(`Title generation failed with key ${apiKey.substring(0, 8)}...`, err.message);
        // Try next key
        continue;
      }
    }
    
    // Jika semua API key gagal, gunakan fallback
    console.warn('All API keys failed for title generation, using fallback');
    return generateFallbackTitle(userMessage);
    
  } catch (err) {
    console.error('Error generating conversation title:', err);
    return generateFallbackTitle(userMessage);
  }
}

/**
 * Update judul percakapan di database (hanya jika masih default)
 * 
 * @param {Object} supabase - Supabase client
 * @param {string} conversationId - ID percakapan
 * @param {string} newTitle - Judul baru
 * @returns {Promise<boolean>} Success status
 */
export async function updateConversationTitle(supabase, conversationId, newTitle) {
  try {
    // Update hanya jika title masih default atau "Percakapan Baru"
    const { error } = await supabase
      .from('tutor_conversations')
      .update({ 
        title: newTitle,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId)
      .or('title.eq.Percakapan Baru,title.eq.Obrolan baru,title.ilike.Chat%');

    if (error) {
      console.error('Error updating conversation title:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error in updateConversationTitle:', err);
    return false;
  }
}
