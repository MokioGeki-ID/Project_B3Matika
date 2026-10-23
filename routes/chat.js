// api/chat.js  →  POST /api/chat
// Proxy ke Gemini API dengan integrasi conversation history, attachments, dan context material/video
// UPDATED: Menggunakan @google/generative-ai SDK resmi

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
      // Check if SDK can be loaded
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      return res.status(200).json({ status: 'ok', message: 'Layanan AI siap.' });
    } catch (e) {
      return res.status(500).json({ status: 'error', message: 'Gagal memuat SDK AI: ' + e.message });
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
      console.error('User Message Error Details:', {
        conversation_id,
        content_length: user_message.length,
        error_code: userMsgError?.code,
        error_message: userMsgError?.message,
      });
      return errorResponse(res, 'Gagal menyimpan pesan.', 500);
    }

    console.log(`✅ User message saved: ${userMsg.id}`);

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
        }
      }
    }

    // 6. BUILD CHAT HISTORY FOR GEMINI
    const chatHistory = [];
    if (history && history.length > 0) {
      history.forEach(msg => {
        chatHistory.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }],
        });
      });
    }

    // Add current user message
    chatHistory.push({
      role: 'user',
      parts: [{ text: user_message }],
    });

    // Build system instruction with context
    const systemInstruction = buildSystemInstruction(
      conversation.tone,
      topicCatalogText,
      videoCatalogText
    );

    // 7. CALL GEMINI AI WITH UPDATED SDK
    // Model name yang benar: gemini-1.5-flash atau gemini-1.5-pro
    const modelName = env.GEMINI_MODEL || "gemini-1.5-flash";
    
    let lastError = null;
    let result = null;

    // Try each API key until one works
    for (const currentKey of apiKeys) {
      try {
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(currentKey);
        
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: systemInstruction,
        });

        // Start chat with history
        const chat = model.startChat({
          history: chatHistory.slice(0, -1), // Exclude last user message
          generationConfig: {
            maxOutputTokens: 2048,
            temperature: conversation.tone === 'santai' ? 0.8 : 0.7,
          },
        });

        // Stream response
        result = await chat.sendMessageStream(user_message);
        
        break; // Success - exit loop
      } catch (err) {
        lastError = err;
        const status = err.status || err.statusCode || 500;
        const msg = err.message || '';
        
        console.error(`Gemini API Error (key ${apiKeys.indexOf(currentKey) + 1}/${apiKeys.length}):`, {
          status,
          message: msg,
          code: err.code,
        });
        
        // Rotate API key only for auth/quota errors
        if ([401, 403, 429].includes(status) || 
            msg.toLowerCase().includes('quota') || 
            msg.toLowerCase().includes('api key') ||
            msg.toLowerCase().includes('invalid')) {
          console.warn(`⚠️ Rotasi API Key (status ${status})`);
          continue;
        } else {
          break; // Other errors - don't rotate
        }
      }
    }

    if (!result) {
      const errMsg = lastError?.message || 'AI tidak memberikan respons.';
      const status = lastError?.status || lastError?.statusCode || 500;
      console.error(`API Error (${status}):`, errMsg);
      
      if (status === 429 || errMsg.toLowerCase().includes('quota')) {
        return errorResponse(res, 'Jatah AI sedang habis, coba lagi nanti.', 429);
      }
      
      if (errMsg.toLowerCase().includes('model') || errMsg.toLowerCase().includes('not found')) {
        return errorResponse(res, `Model ${modelName} tidak tersedia. Periksa GEMINI_MODEL di environment.`, 500);
      }
      
      return errorResponse(res, 'Gagal terhubung ke AI Tutor: ' + errMsg, status);
    }

    // 8. STREAM RESPONSE TO CLIENT
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    let fullResponse = '';
    let hasResponded = false;

    try {
      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          hasResponded = true;
          fullResponse += text;
          
          const data = JSON.stringify({ text });
          res.write(`data: ${data}\n\n`);
        }
      }
    } catch (streamError) {
      console.error('Stream error:', streamError);
      if (!hasResponded) {
        res.write(`data: ${JSON.stringify({ error: 'Stream terputus, coba kirim ulang.' })}\n\n`);
        res.end();
        return;
      }
    }
    
    if (!hasResponded || !fullResponse) {
      res.write(`data: ${JSON.stringify({ error: 'AI tidak memberikan jawaban, coba kirim ulang.' })}\n\n`);
      res.end();
      return;
    }

    // 9. SANITIZE RESPONSE (remove unauthorized YouTube links)
    let sanitizedResponse = fullResponse;
    
    // Remove YouTube links that are not from our video catalog
    const youtubeRegex = /https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]+/g;
    const foundLinks = fullResponse.match(youtubeRegex) || [];
    
    if (foundLinks.length > 0) {
      const videoCodes = extractVideoCodes(fullResponse);
      
      if (videoCodes.length > 0) {
        const videos = conversation.topic_id 
          ? await getTopicVideos(supabase, conversation.topic_id)
          : [];
        sanitizedResponse = replaceVideoCodesWithLinks(fullResponse, videos);
      }
      
      // Remove any remaining unauthorized YouTube links
      sanitizedResponse = sanitizedResponse.replace(youtubeRegex, '[link tidak tersedia]');
    }

    // 10. EXTRACT METADATA
    const topicIds = extractTopicIds(sanitizedResponse);
    const videoCodes = extractVideoCodes(sanitizedResponse);
    const meta = buildMessageMeta(topicIds, videoCodes);

    // 11. SAVE AI RESPONSE TO DATABASE
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
      // Log error detail untuk debugging
      console.error('AI Message Error Details:', {
        conversation_id,
        content_length: sanitizedResponse.length,
        meta,
        error_code: aiMsgError.code,
        error_message: aiMsgError.message,
      });
      // Don't fail the request - message was already sent to client
      // Tapi user perlu tahu bahwa pesan tidak tersimpan
      res.write(`data: ${JSON.stringify({ 
        warning: 'Jawaban berhasil dikirim tapi gagal disimpan. Refresh halaman untuk melihat.' 
      })}\n\n`);
    } else {
      console.log(`✅ AI message saved for conversation ${conversation_id}`);
    }

    // 12. AUTO-GENERATE TITLE (BACKGROUND)
    const { count: messageCount } = await supabase
      .from('tutor_messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversation_id);

    if (messageCount === 2) {
      import('./_lib/titleGenerator.js')
        .then(({ generateConversationTitle, updateConversationTitle }) => {
          return generateConversationTitle(user_message, conversation.tone)
            .then(newTitle => updateConversationTitle(supabase, conversation_id, newTitle));
        })
        .catch(err => {
          console.error('Background title generation failed:', err);
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
