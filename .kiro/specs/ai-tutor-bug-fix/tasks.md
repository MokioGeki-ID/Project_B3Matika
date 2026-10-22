# Implementation Plan

## Overview

This implementation plan follows the bugfix exploratory workflow to fix the AI Tutor feature where API method shortcuts (api.get, api.post, api.patch, api.delete) are missing from the api.js export, causing all AI Tutor functionality to fail with TypeError.

The fix involves:
1. Writing exploration tests to confirm the bug exists (tests will fail on unfixed code)
2. Writing preservation tests to capture baseline behavior (tests will pass on unfixed code)
3. Adding method shortcuts to api.js with query parameter support
4. Fixing broken logo paths to use existing B3Matika logo
5. Verifying the fix resolves the bug and preserves existing behavior

**Critical**: The exploration test in task 1 MUST fail on unfixed code - this confirms the bug. After the fix in task 3, the same test should pass, confirming the fix works.

## Tasks

- [ ] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - API Method Shortcuts Are Missing
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Test each method shortcut (get, post, patch, delete) to ensure all are missing
  - Test that api.get, api.post, api.patch, and api.delete exist and are callable functions
  - Test that api.get('/api/tutor/conversations', { params: { page: 1, limit: 20 } }) handles query parameters correctly
  - Test that api.post('/api/tutor/conversations', { title: 'Test', tone: 'baku' }) sends body data correctly
  - Test that api.patch('/api/tutor/conversations/123', { title: 'Updated' }) sends body data correctly
  - Test that api.delete('/api/tutor/conversations/123') executes without body
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS with TypeError (api.get is not a function, etc.) - this is correct and proves the bug exists
  - Document counterexamples found (which method shortcuts are missing and what errors occur)
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.8_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Direct API Function Calls Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for direct function calls: api(path, { method, body })
  - Test direct GET calls: api('/api/test', { method: 'GET' })
  - Test direct POST calls: api('/api/test', { method: 'POST', body: { data: 'test' } })
  - Test direct PATCH calls: api('/api/test', { method: 'PATCH', body: { data: 'test' } })
  - Test direct DELETE calls: api('/api/test', { method: 'DELETE' })
  - Test authentication token inclusion in headers
  - Test error handling for various HTTP status codes (401, 403, 404, 429, 500)
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

- [ ] 3. Fix for API method shortcuts missing and broken logo paths

  - [ ] 3.1 Add query parameter handling helper function to api.js
    - Add buildQueryString(params) helper function before method shortcuts
    - Function should convert params object to URL query string
    - Handle undefined and null values by excluding them
    - Return empty string for empty params, otherwise return '?key=value&...'
    - _Bug_Condition: isBugCondition(code) where code calls api.get/post/patch/delete that don't exist_
    - _Expected_Behavior: Method shortcuts exist and execute correct HTTP requests with authentication_
    - _Preservation: Direct api(path, {method, body}) calls continue working exactly as before_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.8, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

  - [ ] 3.2 Add method shortcuts to api.js
    - Add api.get = async (path, options = {}) implementation with params support
    - Add api.post = async (path, body, options = {}) implementation
    - Add api.patch = async (path, body, options = {}) implementation
    - Add api.delete = async (path, options = {}) implementation
    - Each method should call the base api function with correct method parameter
    - GET method should extract params from options and append query string
    - POST and PATCH should accept body as second parameter
    - All methods should merge remaining options into api call
    - _Bug_Condition: isBugCondition(code) where code calls api.get/post/patch/delete that don't exist_
    - _Expected_Behavior: Method shortcuts exist and execute correct HTTP requests with authentication_
    - _Preservation: Direct api(path, {method, body}) calls continue working exactly as before_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.8, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

  - [ ] 3.3 Fix broken logo paths in TutorChat component
    - Locate TutorChat.jsx component file
    - Find any references to '/images/ai-tutor-logo.png' or missing logo files
    - Replace with '/logo-b3.jpeg' which exists in public folder
    - Ensure alt text is set to "B3Matika"
    - _Bug_Condition: Component references non-existent logo file path_
    - _Expected_Behavior: Logo displays correctly using existing B3Matika logo file_
    - _Preservation: No impact on other components or features_
    - _Requirements: 2.6, 2.7_

  - [ ] 3.4 Replace robot icon with B3Matika logo in sidebar
    - Locate ConversationList.jsx or sidebar component
    - Find usage of Bot icon from lucide-react
    - Replace <Bot /> with <img src="/logo-b3.jpeg" alt="B3Matika" />
    - Apply consistent sizing to match sidebar icon style (likely w-6 h-6 or similar)
    - _Bug_Condition: Component uses generic robot icon instead of B3Matika branding_
    - _Expected_Behavior: B3Matika logo displays in sidebar maintaining visual consistency_
    - _Preservation: No impact on other components or features_
    - _Requirements: 2.6, 2.7_

  - [ ] 3.5 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - API Method Shortcuts Function Correctly
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - Verify all method shortcuts (get, post, patch, delete) are now callable
    - Verify query parameter handling works in api.get
    - Verify body data is sent correctly in api.post and api.patch
    - Verify authentication headers are included in all requests
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.8_

  - [ ] 3.6 Verify preservation tests still pass
    - **Property 2: Preservation** - Direct API Function Calls Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all direct function calls still work identically
    - Confirm authentication token handling unchanged
    - Confirm error handling produces same error objects
    - Confirm all tests still pass after fix (no regressions)

- [ ] 4. Integration testing

  - [ ] 4.1 Test AI Tutor page loads without errors
    - Navigate to /ai-tutor page in browser
    - Open browser console (F12)
    - Verify no JavaScript errors appear
    - Verify page renders correctly with conversation list sidebar
    - _Requirements: 2.1, 2.6_

  - [ ] 4.2 Test conversation list loads correctly
    - Verify existing conversations appear in sidebar
    - Verify GET request to /api/tutor/conversations succeeds
    - Verify pagination works (page and limit query parameters)
    - Verify B3Matika logo appears correctly in sidebar (not generic robot icon)
    - _Requirements: 2.1, 2.2, 2.6, 2.7_

  - [ ] 4.3 Test create new conversation
    - Click "Percakapan Baru" button
    - Verify POST request to /api/tutor/conversations succeeds
    - Verify new conversation appears in sidebar
    - Verify conversation has default title
    - _Requirements: 2.2, 2.3_

  - [ ] 4.4 Test rename conversation
    - Click on conversation title to edit
    - Change title and save
    - Verify PATCH request to /api/tutor/conversations/:id succeeds
    - Verify title updates in sidebar
    - _Requirements: 2.4_

  - [ ] 4.5 Test delete conversation
    - Click delete button on a conversation
    - Confirm deletion
    - Verify DELETE request to /api/tutor/conversations/:id succeeds
    - Verify conversation removed from sidebar
    - _Requirements: 2.5_

  - [ ] 4.6 Test logo displays correctly
    - Verify B3Matika logo appears in welcome screen (not broken image)
    - Verify logo file path is /logo-b3.jpeg
    - Verify logo has proper alt text
    - _Requirements: 2.6, 2.7_

  - [ ] 4.7 Test preserved features still work
    - Test voice input and output functionality
    - Test file attachment uploads
    - Test message streaming (real-time AI responses)
    - Test tone settings (baku/santai)
    - Verify no regressions in existing functionality
    - _Requirements: 3.3, 3.4, 3.5, 3.6_

  - [ ] 4.8 Test non-AI-Tutor pages unaffected
    - Navigate to /quiz page - verify works normally
    - Navigate to /materi page - verify works normally
    - Navigate to /dashboard page - verify works normally
    - Navigate to /auth pages - verify work normally
    - Verify no console errors on any page
    - _Requirements: 3.7_

- [ ] 5. Production build testing

  - [ ] 5.1 Build production bundle
    - Run npm run build
    - Verify build completes without errors
    - Check bundle size is reasonable
    - _Requirements: 2.8_

  - [ ] 5.2 Test production build locally
    - Serve the dist folder locally (e.g., with serve or http-server)
    - Test all functionality from integration tests on production build
    - Verify minified code doesn't break method shortcuts
    - Verify no console errors in production mode
    - _Requirements: 2.8_

  - [ ] 5.3 Deploy to staging/preview environment
    - Deploy to Vercel preview or staging environment
    - Test all functionality in deployed environment
    - Verify API requests work with production API
    - Monitor for any production-specific issues
    - _Requirements: 2.8_

- [ ] 6. Checkpoint - Ensure all tests pass
  - Verify all unit tests pass
  - Verify all property-based tests pass
  - Verify all integration tests pass
  - Verify production build works correctly
  - Review manual testing checklist completion
  - Ask the user if questions arise or if any issues need attention


## Task Dependency Graph

```json
{
  "waves": [
    {
      "name": "Exploration Testing",
      "tasks": ["1"]
    },
    {
      "name": "Preservation Testing",
      "tasks": ["2"]
    },
    {
      "name": "Implementation",
      "tasks": ["3.1", "3.2", "3.3", "3.4", "3.5", "3.6"]
    },
    {
      "name": "Integration Testing",
      "tasks": ["4.1", "4.2", "4.3", "4.4", "4.5", "4.6", "4.7", "4.8"]
    },
    {
      "name": "Production Validation",
      "tasks": ["5.1", "5.2", "5.3"]
    },
    {
      "name": "Final Checkpoint",
      "tasks": ["6"]
    }
  ]
}
```

**Visual Representation**:
```
1. Write bug condition exploration test (standalone)
   ↓
2. Write preservation property tests (standalone)
   ↓
3. Fix for API method shortcuts missing and broken logo paths
   ├── 3.1 Add query parameter handling helper function
   ├── 3.2 Add method shortcuts to api.js
   ├── 3.3 Fix broken logo paths in TutorChat
   ├── 3.4 Replace robot icon with B3Matika logo
   ├── 3.5 Verify bug condition test passes
   └── 3.6 Verify preservation tests pass
   ↓
4. Integration testing
   ├── 4.1 Test AI Tutor page loads
   ├── 4.2 Test conversation list loads
   ├── 4.3 Test create conversation
   ├── 4.4 Test rename conversation
   ├── 4.5 Test delete conversation
   ├── 4.6 Test logo displays correctly
   ├── 4.7 Test preserved features work
   └── 4.8 Test non-AI-Tutor pages unaffected
   ↓
5. Production build testing
   ├── 5.1 Build production bundle
   ├── 5.2 Test production build locally
   └── 5.3 Deploy to staging/preview
   ↓
6. Checkpoint
```

**Dependencies**:
- Task 2 should be completed before task 3 (observe baseline before fixing)
- Task 3.1 must be completed before 3.2 (helper function needed for method shortcuts)
- Task 3 must be fully completed before tasks 4 and 5
- All previous tasks must pass before reaching task 6 checkpoint

## Notes

### Key Reminders

1. **Exploration Test Expected Failure**: Task 1 MUST produce test failures on unfixed code. Do NOT fix the test or code at this stage. Document the failures as counterexamples that prove the bug exists.

2. **Preservation Test Expected Pass**: Task 2 MUST produce passing tests on unfixed code. This captures the baseline behavior we need to preserve.

3. **Property-Based Testing**: Task 2 uses property-based testing (PBT) for stronger preservation guarantees. PBT generates many test cases automatically, catching edge cases that manual tests might miss.

4. **Same Tests, Different Expectations**: Tasks 3.5 and 3.6 re-run the SAME tests from tasks 1 and 2, but with opposite expectations:
   - Task 1 test should FAIL on unfixed code → Task 3.5 should PASS on fixed code
   - Task 2 tests should PASS on unfixed code → Task 3.6 should PASS on fixed code

5. **Logo Files**: The fix uses `/logo-b3.jpeg` which already exists. Do not create new logo files.

6. **Backward Compatibility**: The fix maintains full backward compatibility. Existing code using `api(path, {method, body})` continues working unchanged.

7. **Test Framework**: Use the project's existing test framework (likely Vitest or Jest based on package.json). Run tests with `npm test` or equivalent.

8. **Manual Testing**: Task 4 includes comprehensive manual testing. Use browser DevTools to monitor network requests and console errors.

9. **Production Build**: Task 5.1 requires `npm run build` to succeed. Task 5.2 tests the built output, not the development server.

### Testing Commands

```bash
# Run unit tests
npm test

# Run specific test file
npm test -- api.test.js

# Build for production
npm run build

# Serve production build locally
npx serve dist
# or
npx http-server dist
```

### Files to Modify

- `resources/js/lib/api.js` - Add method shortcuts and query parameter helper
- `resources/js/components/tutor/TutorChat.jsx` - Fix logo path
- `resources/js/components/tutor/ConversationList.jsx` - Replace robot icon with logo
- Test files (create new test file for api.js if it doesn't exist)

### Success Criteria

The fix is complete when:
- ✅ Task 1 test fails on unfixed code (bug confirmed)
- ✅ Task 2 tests pass on unfixed code (baseline captured)
- ✅ Task 3.5 test passes on fixed code (bug resolved)
- ✅ Task 3.6 tests pass on fixed code (no regressions)
- ✅ All integration tests pass
- ✅ Production build works correctly
- ✅ AI Tutor feature is fully functional
