# AI Tutor Bug Fix Design

## Overview

This design addresses a critical bug in the AI Tutor feature (/ai-tutor) where the API client implementation mismatch causes the entire feature to become non-functional. The root cause is that `api.js` exports a single function `api(path, options)`, but components (`ConversationList`, `TutorChat`) expect an object with method shortcuts (`api.get()`, `api.post()`, `api.patch()`, `api.delete()`).

The fix will add method shortcuts to the API export while maintaining backward compatibility with existing code that directly calls `api(path, { method, body })`. Additionally, this fix will correct broken logo paths to use the existing B3Matika logo files.

**Impact**: This is a critical bug that makes the entire AI Tutor feature unusable. The fix is minimal and targeted, affecting only the API client export structure.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when components call method shortcuts (api.get, api.post, api.patch, api.delete) that don't exist on the exported api function
- **Property (P)**: The desired behavior - method shortcuts should be available and execute the correct HTTP requests with proper authentication
- **Preservation**: Existing direct calls to api(path, {method, body}) must continue working; voice features, file attachments, streaming responses, and all other non-AI-Tutor features must remain unchanged
- **api function**: The base function in `resources/js/lib/api.js` that wraps fetch with authentication and error handling
- **Method shortcuts**: Convenience methods (get, post, patch, delete) that internally call the base api function with the appropriate method parameter
- **ConversationList**: Component that displays the list of AI Tutor conversations in the sidebar
- **TutorChat**: Component that displays the active conversation and message interface

## Bug Details

### Bug Condition

The bug manifests when any component tries to call method shortcuts on the `api` import. The `api.js` file exports only a single function, but components expect an object with multiple methods.

**Formal Specification:**
```
FUNCTION isBugCondition(code)
  INPUT: code of type JavaScriptCode
  OUTPUT: boolean
  
  RETURN code.imports('api' FROM '@/lib/api')
         AND (code.calls('api.get') OR code.calls('api.post') 
              OR code.calls('api.patch') OR code.calls('api.delete'))
         AND api.exports === Function (not Object with methods)
END FUNCTION
```

### Examples

**Bug Manifestation Examples:**

1. **GET Request Failure**:
   - Code: `await api.get('/api/tutor/conversations')`
   - Expected: Execute HTTP GET request to fetch conversations
   - Actual: `TypeError: api.get is not a function` (or `Se.get is not a function` in minified production)

2. **POST Request Failure**:
   - Code: `await api.post('/api/tutor/conversations', { title: 'New Chat', tone: 'baku' })`
   - Expected: Execute HTTP POST request to create a new conversation
   - Actual: `TypeError: api.post is not a function`

3. **PATCH Request Failure**:
   - Code: `await api.patch('/api/tutor/conversations/123', { title: 'Updated Title' })`
   - Expected: Execute HTTP PATCH request to update conversation title
   - Actual: `TypeError: api.patch is not a function`

4. **DELETE Request Failure**:
   - Code: `await api.delete('/api/tutor/conversations/123')`
   - Expected: Execute HTTP DELETE request to delete conversation
   - Actual: `TypeError: api.delete is not a function`

5. **Broken Logo Image**:
   - Code: `<img src="/images/ai-tutor-logo.png" />`
   - Expected: Display B3Matika logo
   - Actual: Broken image (file doesn't exist)

### Root Cause

The root cause is clear from analyzing the code structure:

1. **Export Mismatch**: `api.js` exports a single function:
   ```javascript
   export async function api(path, { method = 'GET', body } = {}) { ... }
   ```

2. **Import Expectation**: Components import and use it as an object with methods:
   ```javascript
   import { api } from '@/lib/api';
   // Then call:
   await api.get(url)
   await api.post(url, data)
   ```

3. **Minification Confusion**: In production (Vercel), the code is minified, so error messages show abbreviated variable names like `Se.post is not a function`, making debugging harder.

4. **Logo Path Issue**: Component references `/images/ai-tutor-logo.png` but the file doesn't exist; should use `/logo-b3.jpeg` which is already available.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**

1. **Direct API Function Calls**: Existing code that calls `api(path, { method, body })` directly must continue to work exactly as before
   - Example: `await api('/auth/login', { method: 'POST', body: { email, password } })`

2. **Voice Features**: All voice input and voice response functionality in AI Tutor must remain unchanged
   - Voice recording, transcription, and playback
   - Voice settings and preferences

3. **File Attachments**: File upload and display functionality must remain unchanged
   - Image attachments
   - Document attachments
   - Attachment storage and retrieval

4. **Streaming Responses**: Real-time streaming of AI responses must continue to work
   - SSE (Server-Sent Events) or fetch streams
   - Progressive message display

5. **Other Features**: All non-AI-Tutor features must be completely unaffected
   - Authentication pages
   - Quiz pages
   - Material pages
   - Dashboard

6. **Tone Settings**: Conversation tone (baku/santai) settings must continue to work

7. **Database Operations**: Conversation and message deletion with cascading to attachments must work correctly

**Scope:**
All API calls that don't use method shortcuts (get/post/patch/delete) should be completely unaffected by this fix. This includes:
- Direct `api(path, options)` calls
- API calls in other components outside AI Tutor
- Backend API endpoints themselves
- Authentication token handling

## Hypothesized Root Cause

Based on the bug analysis, the root cause has been confirmed:

1. **Incorrect Export Structure**: The `api.js` file exports only a function, not an object with methods
   - Current: `export async function api(...) { ... }`
   - Needed: Export that provides both the base function AND method shortcuts

2. **Component Implementation Assumption**: Developers implementing `ConversationList` and `TutorChat` assumed a REST client-like API with method shortcuts (similar to axios, fetch wrappers like ky, or other API clients)
   - This is a reasonable assumption and a common pattern in modern JavaScript

3. **Missing Logo File**: The referenced logo file `/images/ai-tutor-logo.png` was never created
   - Existing file `/logo-b3.jpeg` should be used instead

4. **No Test Coverage**: The AI Tutor components were not tested with the actual API client, allowing the type mismatch to go undetected until runtime

## Correctness Properties

Property 1: Bug Condition - API Method Shortcuts Function Correctly

_For any_ component code that calls method shortcuts (`api.get()`, `api.post()`, `api.patch()`, `api.delete()`) with valid paths and data, the fixed API client SHALL execute the corresponding HTTP request with proper authentication headers and return the parsed response data.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.8**

Property 2: Preservation - Direct API Function Calls Unchanged

_For any_ code that calls the API client using the direct function syntax `api(path, { method, body })`, the fixed API client SHALL produce exactly the same behavior as the original implementation, preserving all existing functionality for components that use this calling pattern.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8**

## Fix Implementation

### Changes Required

**File**: `resources/js/lib/api.js`

**Specific Changes**:

1. **Add Method Shortcuts**: Export an object that includes both the base function and method shortcuts
   ```javascript
   // After the existing api function, add:
   api.get = async (path, options = {}) => {
     return api(path, { ...options, method: 'GET' });
   };
   
   api.post = async (path, body, options = {}) => {
     return api(path, { ...options, method: 'POST', body });
   };
   
   api.patch = async (path, body, options = {}) => {
     return api(path, { ...options, method: 'PATCH', body });
   };
   
   api.delete = async (path, options = {}) => {
     return api(path, { ...options, method: 'DELETE' });
   };
   ```

2. **Maintain Default Export**: Keep the function itself exportable for backward compatibility
   - The function can still be called directly: `api(path, { method, body })`
   - Method shortcuts are available as properties: `api.get(path)`

3. **Improve Error Handling**: The existing error handling is already good, but ensure consistent error messages
   - Current implementation already handles 401, 403, 404, 429, 5xx errors
   - No changes needed here

**File**: `resources/js/components/tutor/ConversationList.jsx` (and similar components)

**Specific Changes**:

1. **Fix Logo Path**: Update any references to `/images/ai-tutor-logo.png`
   - Change to: `/logo-b3.jpeg`
   - This applies to welcome screen and any other logo references

2. **Update Robot Icon**: Replace generic `Bot` icon from lucide-react with B3Matika logo
   - Use `<img src="/logo-b3.jpeg" alt="B3Matika" />` instead of `<Bot />`
   - Apply consistent sizing to match sidebar icon style

**Note**: The method shortcuts signature follows common REST client patterns:
- `get(path, options)` - for query parameters, use options: `{ params: { page: 1 } }`
- `post(path, body, options)` - body is second parameter for convenience
- `patch(path, body, options)` - body is second parameter for convenience
- `delete(path, options)` - no body needed

However, the current `ConversationList.jsx` code shows `api.get` being called with a different signature:
```javascript
await api.get('/api/tutor/conversations', { params: { page: pageNum, limit: 20 } })
```

The implementation will need to handle the `params` option and convert it to query string. We'll add this to the method shortcuts.

### Revised Method Shortcuts Implementation

```javascript
// Helper to build query string from params object
function buildQueryString(params) {
  if (!params || Object.keys(params).length === 0) return '';
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, value);
    }
  });
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

// Method shortcuts
api.get = async (path, options = {}) => {
  const { params, ...restOptions } = options;
  const fullPath = path + buildQueryString(params);
  return api(fullPath, { ...restOptions, method: 'GET' });
};

api.post = async (path, body, options = {}) => {
  return api(path, { ...options, method: 'POST', body });
};

api.patch = async (path, body, options = {}) => {
  return api(path, { ...options, method: 'PATCH', body });
};

api.delete = async (path, options = {}) => {
  return api(path, { ...options, method: 'DELETE' });
};
```

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, confirm that the bug exists in the current code (exploratory), then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm the root cause analysis.

**Test Plan**: Write unit tests that attempt to call method shortcuts on the current API implementation. Run these tests on the UNFIXED code to observe TypeError failures and confirm the diagnosis.

**Test Cases**:

1. **GET Method Missing**: Call `api.get('/api/tutor/conversations')` (will fail on unfixed code)
   - Expected error: `TypeError: api.get is not a function`
   - Confirms: Method shortcuts don't exist

2. **POST Method Missing**: Call `api.post('/api/tutor/conversations', { title: 'Test' })` (will fail on unfixed code)
   - Expected error: `TypeError: api.post is not a function`
   - Confirms: Method shortcuts don't exist

3. **PATCH Method Missing**: Call `api.patch('/api/tutor/conversations/123', { title: 'Updated' })` (will fail on unfixed code)
   - Expected error: `TypeError: api.patch is not a function`
   - Confirms: Method shortcuts don't exist

4. **DELETE Method Missing**: Call `api.delete('/api/tutor/conversations/123')` (will fail on unfixed code)
   - Expected error: `TypeError: api.delete is not a function`
   - Confirms: Method shortcuts don't exist

**Expected Counterexamples**:
- All method shortcut calls will throw TypeError
- Direct function calls like `api('/path', { method: 'GET' })` will work correctly
- Root cause confirmed: export structure mismatch

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds (calls to method shortcuts), the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL (method, path, data) WHERE method IN ['get', 'post', 'patch', 'delete'] DO
  result := api[method](path, data)
  ASSERT result is valid HTTP response
  ASSERT proper authentication headers sent
  ASSERT correct HTTP method used
  ASSERT no TypeError thrown
END FOR
```

**Test Implementation**:
- Mock fetch to capture requests
- Verify each method shortcut:
  - Executes without TypeError
  - Sends correct HTTP method
  - Includes authentication token
  - Handles query parameters (for GET)
  - Sends body data (for POST/PATCH)
  - Returns parsed JSON response

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold (direct function calls), the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL (path, options) WHERE options.method IS SPECIFIED DO
  ASSERT api_original(path, options) = api_fixed(path, options)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain (various paths, methods, bodies)
- It catches edge cases that manual unit tests might miss (special characters, long paths, complex bodies)
- It provides strong guarantees that behavior is unchanged for all direct function calls

**Test Plan**: Observe behavior on UNFIXED code first for direct function calls with various parameters, then write property-based tests capturing that behavior and verify the FIXED code produces identical results.

**Test Cases**:

1. **Direct GET Calls Preserved**: 
   - Test: `api('/path', { method: 'GET' })` on both versions
   - Assert: Identical behavior

2. **Direct POST Calls Preserved**: 
   - Test: `api('/path', { method: 'POST', body: {...} })` on both versions
   - Assert: Identical behavior

3. **Direct PATCH Calls Preserved**: 
   - Test: `api('/path', { method: 'PATCH', body: {...} })` on both versions
   - Assert: Identical behavior

4. **Direct DELETE Calls Preserved**: 
   - Test: `api('/path', { method: 'DELETE' })` on both versions
   - Assert: Identical behavior

5. **Error Handling Preserved**: 
   - Test various HTTP error statuses (401, 403, 404, 429, 500)
   - Assert: Same error messages and error object structure

6. **Token Handling Preserved**: 
   - Test with and without token in localStorage
   - Assert: Authorization header included/excluded correctly

### Unit Tests

- Test each method shortcut (get, post, patch, delete) individually
- Test query parameter handling in GET requests
- Test body serialization in POST/PATCH requests
- Test authentication token inclusion
- Test error handling for various HTTP status codes
- Test logo file existence (`/logo-b3.jpeg`)
- Test ConversationList component renders without errors after fix

### Property-Based Tests

**Generator Strategy**: Generate random valid API call parameters:
- Random valid URL paths (alphanumeric, hyphens, slashes)
- Random HTTP methods
- Random JSON-serializable body objects
- Random query parameter objects

**Properties to Test**:
1. **Method Shortcuts Equivalence**: For any valid (method, path, data), calling `api[method](path, data)` should be equivalent to `api(path, { method: METHOD, body: data })`

2. **Query Parameter Serialization**: For any valid params object, `api.get(path, { params })` should append correct query string to path

3. **Idempotent Error Handling**: For any error response, both direct calls and method shortcuts should produce identical error objects

4. **Token Injection Consistency**: For any request, authentication token should be included in headers identically for both calling patterns

### Integration Tests

- **Full AI Tutor Flow**: Navigate to /ai-tutor, verify page loads without errors
- **Create Conversation**: Click "Percakapan Baru", verify new conversation is created
- **Load Conversations**: Verify conversation list loads with GET request
- **Rename Conversation**: Edit conversation title, verify PATCH request works
- **Delete Conversation**: Delete a conversation, verify DELETE request works
- **Logo Display**: Verify B3Matika logo displays correctly in welcome screen and sidebar
- **Error Recovery**: Simulate API errors (401, 500), verify UI shows user-friendly error messages
- **Voice Features Still Work**: Verify voice input/output continues to function
- **File Attachments Still Work**: Verify file uploads continue to function
- **Streaming Still Works**: Verify message streaming continues to function
- **Non-AI-Tutor Pages**: Verify other pages (quiz, materials, dashboard) are unaffected

### Manual Testing Checklist

Before deployment:
- [ ] Visit /ai-tutor page - no console errors
- [ ] Create new conversation - works
- [ ] Send message - works
- [ ] Edit conversation title - works
- [ ] Delete conversation - works
- [ ] Logo displays correctly (not broken image)
- [ ] Voice features work
- [ ] File upload works
- [ ] Visit other pages - all work normally
- [ ] Test in production build (npm run build, serve dist)
