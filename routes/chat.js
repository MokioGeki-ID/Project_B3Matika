// api/chat.js  →  POST /api/chat
// Proxy ke Gemini API dengan integrasi conversation history, attachments, dan context material/video

import { setCors, errorResponse, requireAuth } from './_lib/auth.js';
import env from './_lib/env.js';
import { getSupabaseClient } from './_lib/supabase.js';
import {
  buildTopicCatalog,
  getTopicVideos,
  formatTopicCatalogForAI,
  formatVideosForAI,
  extractTopicIds,
  extractVideoCodes,
  replaceVideoCodesWithLinks,
  buildMessageMeta
} from './_lib/tutorContext.js';
import { buildSystemInstruction } from './_lib/systemPrompts.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  // Health check endpoint
  if (req.query.health) {
    const key = env.GEMINI_API_KEY || '';
    if (!key) return res.status(503).json({ status: 'down', message: 'API Key Gemini belum dikonfigurasi.' });
    try {
      await import('@google/genai');
      return res.status(200).json({ status: 'ok', message: 'Layanan AI siap.' });
    } catch (e) {
      return res.status(500).json({ status: 'error', message: 'Gagal memuat SDK AI.' });
    }
  }

  if (req.method !== 'POST') return errorResponse(res, 'Method not allowed', 405);

  // Require authentication
  let user;
  try {
    const authResult = await requireAuth(req);
    user = authResult.user;
  } catch (authErr) {
    return errorResponse(res, authErr.message, authErr.status || 401);
  }

  const apiKeyStr = env.GEMINI_API_KEY || '';
  const apiKeys = apiKeyStr.split(',').map(k => k.replace(/['"]/g, '').trim()).filter(k => k);
  if (apiKeys.length === 0) return errorResponse(res, 'Layanan AI belum dikonfigurasi.', 500);

  const { conversation_id, user_message, attachments = [] } = req.body;
  
  // Validate conversation_id
  if (!conversation_id || typeof conversation_id !== 'string') {
    return errorResponse(res, 'conversation_id wajib diisi.', 422);
  }

  // Validate user_message
  if (!user_message || typeof user_message !== 'string' || user_message.trim().length === 0) {
    return errorResponse(res, 'Pesan tidak boleh kosong.', 422);
  }

  if (user_message.length > 4000) {
    return errorResponse(res, 'Pesan terlalu panjang (maksimal 4000 karakter).', 413);
  }

  // Validate attachments array
  if (!Array.isArray(attachments) || attachments.length > 3) {
    return errorResponse(res, 'Maksimal 3 lampiran per pesan.', 422);
  }

  const supabase = getSupabaseClient();

  try {
    // 1. VERIFY CONVERSATION OWNERSHIP (IDOR protection)
    const { data: conversation, error: convError } = await supabase
      .from('tutor_conversations')
      .select('id, tone, topic_id')
      .eq('id', conversation_id)
      .eq('user_id', user.id)
      .single();

    if (convError || !conversation) {
      return errorResponse(res, 'Percakapan tidak ditemukan.', 404);
    }

    // 2. LOAD CONVERSATION HISTORY (last 10 messages for context)
    const { data: history, error: historyError } = await supabase
      .from('tutor_messages')
      .select('role, content')
      .eq('conversation_id', conversation_id)
      .order('created_at', { ascending: true })
      .limit(10);

    if (historyError) {
      console.error('Error loading history:', historyError);
      return errorResponse(res, 'Gagal memuat riwayat chat.', 500);
    }

    // 3. BUILD MATERIAL & VIDEO CONTEXT
    let topicCatalogText = '';
    let videoCatalogText = '';
    
    try {
      const topicCatalog = await buildTopicCatalog(supabase);
      topicCatalogText = formatTopicCatalogForAI(topicCatalog);

      if (conversation.topic_id) {
        const videos = await getTopicVideos(supabase, conversation.topic_id);
        videoCatalogText = formatVideosForAI(videos);
      }
    } catch (ctxError) {
      console.error('Error building context:', ctxError);
      // Continue without context if it fails
    }

    // 4. SAVE USER MESSAGE TO DATABASE
    const { data: userMsg, error: userMsgError } = await supabase
      .from('tutor_messages')
      .insert({
        conversation_id: conversation_id,
        role: 'user',
        content: user_message,
        meta: {}
      })
      .select('id')
      .single();

    if (userMsgError || !userMsg) {
      console.error('Error saving user message:', userMsgError);
      return errorResponse(res, 'Gagal menyimpan pesan.', 500);
    }

    // 5. LINK ATTACHMENTS TO MESSAGE (if any)
    if (attachments.length > 0) {
      const attachmentIds = attachments.filter(id => typeof id === 'string');
      
      if (attachmentIds.length > 0) {
        const { error: linkError } = await supabase
          .from('tutor_attachments')
          .update({ 
            message_id: userMsg.id,
            status: 'attached'
          })
          .in('id', attachmentIds)
          .eq('user_id', user.id)
          .eq('conversation_id', conversation_id)
          .eq('status', 'pending');

        if (linkError) {
          console.error('Error linking attachments:', linkError);
          // Continue anyway - attachments will remain pending
        }
      }
    }

    // 6. LOAD ATTACHMENT FILES FOR MULTIMODAL INPUT
    let attachmentFiles = [];
    if (attachments.length > 0) {
      const { data: files, error: filesError } = await supabase
        .from('tutor_attachments')
        .select('storage_path, mime_type')
        .in('id', attachments)
        .eq('message_id', userMsg.id);

      if (!filesError && files) {
        attachmentFiles = files;
      }
    }

    // 7. PREPARE MULTIMODAL INPUT (text + images)
    let promptText = '';
    
    // Add conversation history
    if (history && history.length > 0) {
      promptText += "RIWAYAT PERCAKAPAN SEBELUMNYA:\n";
      history.forEach(msg => {
        promptText += `${msg.role === 'user' ? 'User' : 'AI'}: ${msg.content}\n`;
      });
      promptText += '\n';
    }
    
    // Add current user message
    promptText += `PESAN USER TERBARU:\n${user_message}`;

    // Build system instruction with context
    const systemInstruction = buildSystemInstruction(
      conversation.tone,
      topicCatalogText,
      videoCatalogText
    );

    // 8. CALL GEMINI AI WITH MULTIMODAL SUPPORT
    const { GoogleGenAI } = await import('@google/genai');
    const modelName = env.GEMINI_MODEL || "gemini-3.8-flash";
    
    let lastError = null;
    let stream = null;

    // Try each API key until one works
    for (const currentKey of apiKeys) {
      try {
        const ai = new GoogleGenAI({ apiKey: currentKey });
        
        // For now, use text-only input (multimodal with file URLs will need signed URLs)
        // TODO: Implement image download and base64 encoding for multimodal input
        stream = await ai.interactions.create({
          model: modelName,
          system_instruction: systemInstruction,
          input: promptText,
          stream: true,
        });
        
        break; // Success - exit loop
      } catch (err) {
        lastError = err;
        const status = err.status || 500;
        const msg = err.message || '';
        
        // Rotate API key only for auth/quota errors
        if ([401, 403, 429].includes(status) || 
            msg.toLowerCase().includes('quota') || 
            msg.toLowerCase().includes('api key')) {
          console.warn(`⚠️ Rotasi API Key (status ${status})`);
          continue;
        } else {
          break; // Other errors - don't rotate
        }
      }
    }

    if (!stream) {
      const errMsg = lastError?.message || 'AI tidak memberikan respons.';
      const status = lastError?.status || 500;
      console.error(`API Error (${status}):`, errMsg);
      
      if (status === 429 || errMsg.toLowerCase().includes('quota')) {
        return errorResponse(res, 'Jatah AI sedang habis, coba lagi nanti.', 429);
      }
      return errorResponse(res, 'Gagal terhubung ke AI Tutor.', status);
    }

    // 9. STREAM RESPONSE TO CLIENT
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    let fullResponse = '';
    let hasResponded = false;

    for await (const chunk of stream) {
      // Handle event stream.delta from Interactions API
      if (chunk.event_type === 'step.delta' && chunk.delta?.type === 'text' && chunk.delta?.text) {
        hasResponded = true;
        const textChunk = chunk.delta.text;
        fullResponse += textChunk;
        
        const data = JSON.stringify({ text: textChunk });
        res.write(`data: ${data}\n\n`);
      }
      // Or if SDK returns fallback format
      else if (chunk.output_text && typeof chunk.output_text === 'string') {
        hasResponded = true;
        fullResponse += chunk.output_text;
        
        const data = JSON.stringify({ text: chunk.output_text });
        res.write(`data: ${data}\n\n`);
      }
    }
    
    if (!hasResponded) {
      // Interactions API object fallback for non-stream / complete
      if (stream.output_text) {
        fullResponse = stream.output_text;
        const data = JSON.stringify({ text: stream.output_text });
        res.write(`data: ${data}\n\n`);
      } else {
        // Empty response
        res.write(`data: ${JSON.stringify({ error: 'AI tidak memberikan jawaban, coba kirim ulang.' })}\n\n`);
        res.end();
        return;
      }
    }

    // 10. SANITIZE RESPONSE (remove unauthorized YouTube links)
    let sanitizedResponse = fullResponse;
    
    // Remove YouTube links that are not from our video catalog
    const youtubeRegex = /https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]+/g;
    const foundLinks = fullResponse.match(youtubeRegex) || [];
    
    if (foundLinks.length > 0) {
      // Get video codes from response
      const videoCodes = extractVideoCodes(fullResponse);
      
      // Replace video codes with actual links
      if (videoCodes.length > 0) {
        const videos = conversation.topic_id 
          ? await getTopicVideos(supabase, conversation.topic_id)
          : [];
        sanitizedResponse = replaceVideoCodesWithLinks(fullResponse, videos);
      }
      
      // Remove any remaining unauthorized YouTube links
      sanitizedResponse = sanitizedResponse.replace(youtubeRegex, '[link tidak tersedia]');
    }

    // 11. EXTRACT METADATA (topic IDs and video codes)
    const topicIds = extractTopicIds(sanitizedResponse);
    const videoCodes = extractVideoCodes(sanitizedResponse);
    const meta = buildMessageMeta(topicIds, videoCodes);

    // 12. SAVE AI RESPONSE TO DATABASE
    const { error: aiMsgError } = await supabase
      .from('tutor_messages')
      .insert({
        conversation_id: conversation_id,
        role: 'assistant',
        content: sanitizedResponse,
        meta: meta
      });

    if (aiMsgError) {
      console.error('Error saving AI message:', aiMsgError);
      // Don't fail the request - message was already sent to client
    }

    // 13. AUTO-GENERATE TITLE (BACKGROUND) - Only for first AI response
    // Check if this is the first AI response (message_count = 2: 1 user + 1 ai)
    const { count: messageCount } = await supabase
      .from('tutor_messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversation_id);

    if (messageCount === 2) {
      // This is first AI response - generate title in background (don't block response)
      import('./_lib/titleGenerator.js')
        .then(({ generateConversationTitle, updateConversationTitle }) => {
          return generateConversationTitle(user_message, conversation.tone)
            .then(newTitle => {
              return updateConversationTitle(supabase, conversation_id, newTitle);
            });
        })
        .catch(err => {
          console.error('Background title generation failed:', err);
          // Silent fail - don't affect user experience
        });
    }

    // Send completion signal
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();

  } catch (err) {
    console.error('API Error (Main):', err);
    
    if (!res.headersSent) {
      return errorResponse(res, `Gagal terhubung ke AI Tutor: ${err.message || 'Kesalahan internal'}`, 500);
    } else {
      res.write(`data: ${JSON.stringify({ error: 'Permintaan ke AI terputus.' })}\n\n`);
      res.end();
    }
  }
}
