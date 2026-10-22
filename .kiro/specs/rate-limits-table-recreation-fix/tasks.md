# Implementation Plan

## Overview
Fix the migration script 008_rate_limiter_table.sql to properly recreate the rate_limits table by using DROP TABLE IF EXISTS before CREATE TABLE, ensuring clean schema recreation even when the table already exists.

## Task Dependency Graph
```
1 → 2 → 3 → 3.1 → 3.2 → 3.3 → 4
```

Task 1 (exploration test) and Task 2 (preservation tests) must complete before Task 3 (implementation). Tasks 3.1, 3.2, and 3.3 execute sequentially within the implementation phase.

```json
{
  "waves": [
    ["1"],
    ["2"],
    ["3.1"],
    ["3.2"],
    ["3.3"],
    ["4"]
  ]
}
```

## Tasks

- [ ] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Schema Recreation Fails When Table Exists
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Test the concrete failing case - running the migration script when rate_limits table already exists with a different or same schema
  - Test implementation details:
    - Create a test database or use transaction rollback
    - Run the migration script once (should succeed)
    - Run the migration script again without changes (should be idempotent)
    - Attempt to run an updated migration with schema changes (current bug: fails to update schema)
  - The test assertions should verify:
    - Migration script runs successfully on first execution
    - Migration script runs successfully on second execution (idempotency)
    - Schema changes are properly applied when re-running updated migration
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS when schema needs updating (this is correct - it proves the bug exists)
  - Document counterexamples found to understand root cause (e.g., "CREATE TABLE IF NOT EXISTS skips schema updates when table exists")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: Migration script must handle table recreation properly_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Existing Migration Behavior for New Tables
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (when table doesn't exist)
  - Write property-based tests capturing observed behavior patterns:
    - First-time migration creates table successfully
    - All indexes are created correctly
    - RLS (Row Level Security) is enabled properly
    - Foreign key constraints are established
    - Default values and column types are correct
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: Preserve successful first-time table creation behavior_

- [ ] 3. Fix for rate_limits table recreation

  - [ ] 3.1 Implement the fix
    - Add `DROP TABLE IF EXISTS public.rate_limits CASCADE;` before CREATE TABLE statement
    - Ensure the DROP statement is within the BEGIN/COMMIT transaction block
    - Keep all existing CREATE TABLE, INDEX, and RLS statements unchanged
    - Maintain idempotency - script can be run multiple times safely
    - Add comment explaining the DROP statement purpose
    - _Bug_Condition: Migration script executed when rate_limits table already exists with different schema_
    - _Expected_Behavior: Script drops existing table and recreates with new schema cleanly_
    - _Preservation: First-time table creation, indexes, RLS, constraints, and defaults remain unchanged_
    - _Requirements: Table recreation, idempotency, schema update capability_

  - [ ] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Schema Recreation Succeeds When Table Exists
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed - migration now handles schema recreation)
    - _Requirements: Migration script properly recreates table with updated schema_

  - [ ] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Existing Migration Behavior for New Tables
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions - first-time creation still works)
    - Confirm all tests still pass after fix (no regressions in table creation, indexes, RLS, constraints)

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
  - Verify the migration script can be run multiple times safely
  - Verify schema changes are properly applied on re-runs
  - Verify first-time table creation still works correctly

## Notes

- The fix uses `DROP TABLE IF EXISTS ... CASCADE` to ensure clean table removal including all dependent objects (indexes, constraints)
- The DROP statement must be within the transaction block to maintain atomicity
- Idempotency is preserved: the script can be run multiple times without errors
- The CASCADE option ensures that dependent objects are also dropped, preventing orphaned database objects
- Testing should verify both first-time creation and recreation scenarios
- Consider backup strategies before running DROP operations in production environments
