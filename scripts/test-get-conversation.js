/**
 * Quick test untuk GET /api/tutor/conversations/:id
 * Usage: node scripts/test-get-conversation.js [conversation_id] [token]
 */

const BASE_URL = 'http://localhost:3000';
const CONVERSATION_ID = process.argv[2] || '4423b905-3723-4e14-ac'; // Dari screenshot
const TOKEN = process.argv[3] || '';

async function testGetConversation() {
  console.log('\n🧪 Testing GET /api/tutor/conversations/:id\n');
  console.log(`URL: ${BASE_URL}/api/tutor/conversations/${CONVERSATION_ID}`);
  console.log(`Token: ${TOKEN ? 'Provided' : 'Not provided'}\n`);

  try {
    const response = await fetch(`${BASE_URL}/api/tutor/conversations/${CONVERSATION_ID}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(TOKEN ? { 'Authorization': `Bearer ${TOKEN}` } : {}),
      },
    });

    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Headers:`, Object.fromEntries(response.headers.entries()));

    const contentType = response.headers.get('content-type') || '';
    let data = {};
    
    if (contentType.includes('application/json')) {
      data = await response.json();
      console.log('\nResponse Body:');
      console.log(JSON.stringify(data, null, 2));
    } else {
      const text = await response.text();
      console.log('\nResponse Text:');
      console.log(text);
    }

    if (response.ok) {
      console.log('\n✅ SUCCESS: Endpoint berfungsi!');
      if (data.conversation) {
        console.log(`   - ID: ${data.conversation.id}`);
        console.log(`   - Title: ${data.conversation.title}`);
        console.log(`   - Message Count: ${data.conversation.message_count}`);
      }
    } else {
      console.log('\n❌ FAILED: Response tidak OK');
      if (response.status === 404) {
        console.log('   Kemungkinan: Conversation tidak ditemukan atau bukan milik user');
      } else if (response.status === 401) {
        console.log('   Kemungkinan: Token tidak valid atau tidak diberikan');
      } else if (response.status === 422) {
        console.log('   Kemungkinan: Conversation ID tidak valid (bukan UUID)');
      }
    }

  } catch (err) {
    console.log('\n❌ ERROR:', err.message);
    console.log('   Kemungkinan: Server tidak berjalan atau tidak bisa dijangkau');
  }
}

testGetConversation();
