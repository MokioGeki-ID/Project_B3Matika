# Bugfix Requirements Document

## Introduction

The rate limiting system fails with a database error "column user_id does not exist" when the application queries the rate_limits table. This occurs when the table exists in the database but lacks the user_id column, causing rate limiter queries to fail and potentially blocking legitimate user requests. The bug affects the AI Tutor and other rate-limited features that rely on database-based rate limiting in the serverless environment.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the rate_limits table exists without a user_id column AND application code executes queries with `.eq('user_id', userId)` THEN the system throws PostgreSQL error "42703: column user_id does not exist"

1.2 WHEN the rate_limits table exists without a user_id column AND the DELETE query runs to clean up old records THEN the query fails with "column user_id does not exist" error

1.3 WHEN the rate_limits table exists without a user_id column AND the SELECT query runs to count attempts THEN the query fails with "column user_id does not exist" error

1.4 WHEN the rate_limits table exists without a user_id column AND the INSERT query runs to record new attempts THEN the query fails with "column user_id does not exist" error

### Expected Behavior (Correct)

2.1 WHEN the rate_limits table exists without a user_id column AND the migration script runs THEN the system SHALL detect the schema mismatch and recreate the table with the correct schema including user_id column

2.2 WHEN the 008_rate_limiter_table.sql script runs AND a rate_limits table already exists with incorrect schema THEN the system SHALL drop the old table and create a new one with the correct schema

2.3 WHEN the rate_limits table is created by the migration script THEN the system SHALL ensure the user_id column exists as UUID NOT NULL with a foreign key reference to public.users(id)

2.4 WHEN the rate_limits table is created by the migration script THEN the system SHALL create the index on (user_id, action, created_at DESC) for query performance

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the rate_limits table already exists with the correct schema including user_id column THEN the system SHALL CONTINUE TO execute all queries successfully without modification

3.2 WHEN the migration script runs AND no rate_limits table exists THEN the system SHALL CONTINUE TO create the table with the correct schema as defined in the CREATE TABLE statement

3.3 WHEN application code queries the rate_limits table with correct schema THEN the system SHALL CONTINUE TO perform DELETE, SELECT, and INSERT operations on user_id column without errors

3.4 WHEN RLS (Row Level Security) is enabled on the rate_limits table THEN the system SHALL CONTINUE TO enforce RLS policies without affecting column access

3.5 WHEN the index rate_limits_user_action_created_idx exists THEN the system SHALL CONTINUE TO use it for optimizing queries on user_id, action, and created_at columns
