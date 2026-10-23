/**
 * Smoke test untuk endpoints AI Tutor
 * 
 * Usage:
 *   node scripts/smoke-test-tutor.js [base_url] [auth_token]
 * 
 * Example:
 *   node scripts/smoke-test-tutor.js http://localhost:3000 eyJhbGciOi...
 *   node scripts/smoke-test-tutor.js https://b3matika.vercel.app eyJhbGciOi...
 * 
 * Jika auth_token tidak diberikan, hanya test endpoint public (health)
 */

const BASE_URL = process.argv[2] || 'http://localhost:3000';
const AUTH_TOKEN = process.argv[3] || '';

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

let passedTests = 0;
let failedTests = 0;
const results = [];

async function testEndpoint({ name, method, path, expectedStatus, requiresAuth = true, body = null }) {
  try {
    const url = `${BASE_URL}${path}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };

    if (requiresAuth && AUTH_TOKEN) {
      options.headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
    }

    if (body) {
      options.body = JSON.stringify(body);
    }

    const startTime = Date.now();
    const response = await fetch(url, options);
    const duration = Date.now() - startTime;

    const contentType = response.headers.get('content-type') || '';
    let data = {};
    
    if (contentType.includes('application/json')) {
      data = await response.json();
    }

    const passed = response.status === expectedStatus;

    if (passed) {
      passedTests++;
      console.log(`${COLORS.green}✓${COLORS.reset} ${name} (${duration}ms)`);
    } else {
      failedTests++;
      console.log(`${COLORS.red}✗${COLORS.reset} ${name}`);
      console.log(`  Expected ${expectedStatus}, got ${response.status}`);
      if (data.error) {
        console.log(`  Error: ${typeof data.error === 'string' ? data.error : JSON.stringify(data.error)}`);
      }
    }

    results.push({
      name,
      passed,
      status: response.status,
      expectedStatus,
      duration,
      error: data.error,
    });

    return { passed, status: response.status, data };
  } catch (err) {
    failedTests++;
    console.log(`${COLORS.red}✗${COLORS.reset} ${name}`);
    console.log(`  ${COLORS.red}Error: ${err.message}${COLORS.reset}`);
    
    results.push({
      name,
      passed: false,
      error: err.message,
    });

    return { passed: false, error: err.message };
  }
}

async function runTests() {
  console.log(`\n${COLORS.cyan}=== Smoke Test AI Tutor ===${COLORS.reset}`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Auth: ${AUTH_TOKEN ? 'Provided' : 'Not provided (only testing public endpoints)'}\n`);

  // Health check (should work without auth untuk admin check)
  await testEndpoint({
    name: 'Health Check',
    method: 'GET',
    path: '/api/tutor/health',
    expectedStatus: AUTH_TOKEN ? 200 : 401,
    requiresAuth: true,
  });

  if (!AUTH_TOKEN) {
    console.log(`\n${COLORS.yellow}⚠ Skipping authenticated tests (no auth token provided)${COLORS.reset}`);
    printSummary();
    return;
  }

  // List conversations
  const listResult = await testEndpoint({
    name: 'List Conversations',
    method: 'GET',
    path: '/api/tutor/conversations',
    expectedStatus: 200,
  });

  // Create conversation
  const createResult = await testEndpoint({
    name: 'Create Conversation',
    method: 'POST',
    path: '/api/tutor/conversations',
    expectedStatus: 201,
    body: {
      title: 'Smoke Test Conversation',
      tone: 'baku',
    },
  });

  const conversationId = createResult.data?.conversation?.id;

  if (conversationId) {
    // Get single conversation
    await testEndpoint({
      name: 'Get Single Conversation',
      method: 'GET',
      path: `/api/tutor/conversations/${conversationId}`,
      expectedStatus: 200,
    });

    // Update conversation
    await testEndpoint({
      name: 'Update Conversation (Rename)',
      method: 'PATCH',
      path: `/api/tutor/conversations/${conversationId}`,
      expectedStatus: 200,
      body: {
        title: 'Renamed Test Conversation',
      },
    });

    // Get messages (should be empty)
    await testEndpoint({
      name: 'Get Messages',
      method: 'GET',
      path: `/api/tutor/${conversationId}/messages`,
      expectedStatus: 200,
    });

    // Upload request (will fail without actual file, but should validate)
    await testEndpoint({
      name: 'Upload Request (validation)',
      method: 'POST',
      path: '/api/tutor/uploads',
      expectedStatus: 422, // Should fail validation (no file_name, etc)
      body: {
        conversation_id: conversationId,
      },
    });

    // Delete conversation
    await testEndpoint({
      name: 'Delete Conversation',
      method: 'DELETE',
      path: `/api/tutor/conversations/${conversationId}`,
      expectedStatus: 200,
    });

    // Verify deletion (should 404)
    await testEndpoint({
      name: 'Verify Deletion (should 404)',
      method: 'GET',
      path: `/api/tutor/conversations/${conversationId}`,
      expectedStatus: 404,
    });
  } else {
    console.log(`${COLORS.yellow}⚠ Skipping dependent tests (conversation creation failed)${COLORS.reset}`);
  }

  // Test invalid routes (should 404)
  await testEndpoint({
    name: 'Invalid Route (should 404)',
    method: 'GET',
    path: '/api/tutor/invalid-endpoint',
    expectedStatus: 404,
  });

  printSummary();
}

function printSummary() {
  console.log(`\n${COLORS.cyan}=== Summary ===${COLORS.reset}`);
  console.log(`Passed: ${COLORS.green}${passedTests}${COLORS.reset}`);
  console.log(`Failed: ${failedTests > 0 ? COLORS.red : COLORS.reset}${failedTests}${COLORS.reset}`);
  console.log(`Total:  ${passedTests + failedTests}`);

  if (failedTests > 0) {
    console.log(`\n${COLORS.red}Some tests failed. See details above.${COLORS.reset}`);
    process.exit(1);
  } else {
    console.log(`\n${COLORS.green}All tests passed!${COLORS.reset}`);
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error(`${COLORS.red}Fatal error:${COLORS.reset}`, err);
  process.exit(1);
});
