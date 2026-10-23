#!/usr/bin/env node
/**
 * Test Gemini chat dengan jalur kode PERSIS seperti production
 * Tidak mencetak API key, hanya hasil test
 */

import 'dotenv/config';

// Import env loader yang sama dengan production
async function loadEnv() {
  const { default: env } = await import('../routes/_lib/env.js');
  return env;
}

async function testGeminiChat() {
  console.log('🔍 Testing Gemini Chat dengan jalur kode production...\n');
  
  const env = await loadEnv();
  
  // Tampilkan konfigurasi (tanpa secret)
  console.log('📋 Konfigurasi:');
  console.log(`   GEMINI_MODEL: "${env.GEMINI_MODEL}"`);
  console.log(`   Model length: ${env.GEMINI_MODEL?.length} chars`);
  console.log(`   Has spaces: ${/\s/.test(env.GEMINI_MODEL)}`);
  console.log(`   Has quotes: ${/["']/.test(env.GEMINI_MODEL)}`);
  console.log(`   Trimmed: "${env.GEMINI_MODEL?.trim()}"`);
  console.log(`   API keys count: ${env.GEMINI_API_KEY ? env.GEMINI_API_KEY.split(',').length : 0}\n`);
  
  if (!env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY tidak ditemukan di environment');
    process.exit(1);
  }
  
  const apiKeys = env.GEMINI_API_KEY.split(',').map(k => k.trim()).filter(Boolean);
  const modelName = env.GEMINI_MODEL || "gemini-1.5-flash";
  
  console.log('🚀 Testing dengan model:', modelName);
  console.log('');
  
  // Test dengan kode PERSIS seperti chat.js
  let lastError = null;
  let result = null;
  let successKeyIndex = -1;

  for (let i = 0; i < apiKeys.length; i++) {
    const currentKey = apiKeys[i];
    const keyPreview = currentKey.substring(0, 8) + '...' + currentKey.substring(currentKey.length - 4);
    
    console.log(`🔑 Testing key ${i + 1}/${apiKeys.length}: ${keyPreview}`);
    
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(currentKey);
      
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: "Kamu adalah tutor matematika.",
      });

      // Start chat
      const chat = model.startChat({
        history: [],
        generationConfig: {
          maxOutputTokens: 2048,
          temperature: 0.7,
        },
      });

      // Send test message
      console.log('   📤 Sending test message...');
      result = await chat.sendMessageStream("Hai, satu tambah satu berapa?");
      
      successKeyIndex = i;
      console.log('   ✅ SUCCESS - Model responded!\n');
      break;
      
    } catch (err) {
      lastError = err;
      const status = err.status || err.statusCode || 'unknown';
      const msg = err.message || 'Unknown error';
      const code = err.code || 'N/A';
      
      console.log('   ❌ FAILED');
      console.log(`   HTTP Status: ${status}`);
      console.log(`   Error Code: ${code}`);
      console.log(`   Message: ${msg}`);
      console.log('');
      
      // Check if should rotate (sama seperti chat.js)
      if ([401, 403, 429].includes(status) || 
          msg.toLowerCase().includes('quota') || 
          msg.toLowerCase().includes('api key') ||
          msg.toLowerCase().includes('invalid')) {
        console.log('   ⚠️  Rotating to next key...\n');
        continue;
      } else {
        console.log('   ⚠️  Non-auth error, stopping rotation\n');
        break;
      }
    }
  }

  console.log('='.repeat(60));
  console.log('📊 HASIL TEST\n');
  
  if (result) {
    console.log('✅ BERHASIL!');
    console.log(`   Key yang berhasil: ${successKeyIndex + 1}/${apiKeys.length}`);
    console.log('   Model: ' + modelName);
    console.log('');
    
    // Stream response
    console.log('📥 Streaming response:');
    console.log('-'.repeat(60));
    let fullText = '';
    try {
      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          fullText += text;
          process.stdout.write(text);
        }
      }
      console.log('\n' + '-'.repeat(60));
      console.log(`\n✅ Total chars: ${fullText.length}`);
      console.log('✅ Stream completed successfully!\n');
    } catch (streamErr) {
      console.log('\n' + '-'.repeat(60));
      console.error('\n❌ Stream error:', streamErr.message);
    }
    
  } else {
    console.log('❌ GAGAL - Tidak ada key yang berhasil\n');
    
    if (lastError) {
      console.log('Error terakhir:');
      console.log(`   HTTP Status: ${lastError.status || lastError.statusCode || 'unknown'}`);
      console.log(`   Error Code: ${lastError.code || 'N/A'}`);
      console.log(`   Message: ${lastError.message || 'Unknown'}`);
      console.log('');
      
      // Analisis error (seperti di chat.js line 254)
      const errMsg = lastError.message || '';
      const status = lastError.status || lastError.statusCode || 500;
      
      console.log('🔍 Analisis (seperti production code):');
      
      if (status === 429 || errMsg.toLowerCase().includes('quota')) {
        console.log('   → Akan muncul: "Jatah AI sedang habis, coba lagi nanti."');
      } else if (errMsg.toLowerCase().includes('model') || errMsg.toLowerCase().includes('not found')) {
        console.log(`   → Akan muncul: "Model ${modelName} tidak tersedia. Periksa GEMINI_MODEL di environment."`);
        console.log('');
        console.log('   ⚠️  PERHATIAN: Kondisi ini terlalu luas!');
        console.log('   Error apapun yang mengandung kata "model" atau "not found"');
        console.log('   akan dianggap sebagai "model tidak tersedia".');
      } else {
        console.log(`   → Akan muncul: "Gagal terhubung ke AI Tutor: ${errMsg}"`);
      }
    }
    
    console.log('');
  }
  
  console.log('='.repeat(60));
}

testGeminiChat().catch(err => {
  console.error('\n❌ Unhandled error:', err);
  process.exit(1);
});
