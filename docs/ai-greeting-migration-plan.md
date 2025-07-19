# AI Advocate Greeting Migration Plan

This document outlines the plan for migrating the job-matching greeting functionality to use the AI advocate system.

## Overview

The job-matching logic was developed as an early draft of the special link feature, checking if a user was properly registered in the corresponding tables and rendering a relatively static modal with data from the job matching table. The goal is to migrate this to a dynamic greeting produced by the AI advocate, which is already used by the "ask AI about me" feature.

## Migration Phases

### Phase 1: Enhance AI Advocate with Greeting Capability ✅

**Status: Completed**

In this phase, we enhanced the AI advocate system to generate personalized greetings for recruiters:

1. **Backend Changes**:
   - Added `generateGreetingPrompt` function to `prompt-generator.mjs` to create greeting-specific prompts
   - Added `buildGreetingRulesSection` function to `utils.mjs` with greeting-specific rules
   - Added `generateAIGreeting` function to `ai-advocate/index.mjs` to generate AI greetings
   - Updated greeting handlers to use AI-generated content with fallbacks to static content

2. **Testing**:
   - Created comprehensive tests for the greeting prompt generation
   - Created tests for the AI greeting generation
   - Ensured all tests pass with proper TypeScript typing

3. **Type System Improvements**:
   - Created shared types for the application in `/types/data/advocate.ts` and `/types/aws/cloudfront.ts`
   - Updated test types to import and use the application types
   - Eliminated duplication between test and application code

### Phase 2: Simplify Data Access and Remove Dependencies

**Status: Completed**

In this phase, we will simplify the data access patterns:

1. **Data Access Consolidation**:
   - Remove fallback to legacy job matching table
   - Remove unused resolver functions

2. **Key Implementation Details**:
   - Remove the fallback logic that queries the job matching table in `ai-advocate/index.mjs`
   - Remove the unused `handleGetAdvocateGreetingByLinkId` function
   - Remove the `getMatchingData` function since it's no longer needed
   - Update comments to reflect that we're using advocate greeting, not job matching

3. **Implementation Steps**:
   - Analyze frontend-to-backend flow to identify which functions are actually used ✅
   - Confirm that `getAdvocateGreetingByLinkId` is not used by the frontend ✅
   - Update the `handleGetAdvocateGreeting` function to remove job matching fallback ✅
   - Remove the unused `handleGetAdvocateGreetingByLinkId` function ✅
   - Remove the `getMatchingData` function ✅
   - Update comments and documentation ✅

### Phase 3: Remove Job Matching Stack

**Status: Completed**

In this phase, we completed the migration:

1. **Complete Migration**:
   - Removed the job-matching stack from the CDK app
   - Updated all references to job matching in the codebase
   - Created the RecruiterProfiles table in the AI Advocate stack
   - Instantiated the AI Advocate stack in the CDK app

2. **Key Implementation Details**:
   - Updated the AI advocate stack to create the RecruiterProfiles table
   - Updated the AI advocate stack to create the AI advocate Lambda function
   - Updated the API stack to remove dependencies on job matching table
   - Updated the GraphQL schema to remove the unused resolver
   - Updated the `useAdvocateGreetingDev` hook to remove references to the removed resolver

### Phase 4: Fix Circular Dependencies

**Status: Completed**

In this phase, we fixed circular dependencies between the API stack and AI Advocate stack:

1. **Problem Identification**:
   - Identified circular dependency between API stack and AI Advocate stack
   - API stack needed AI Advocate Lambda for resolvers
   - AI Advocate stack needed API for adding resolvers

2. **Solution Implementation**:
   - Used CloudFormation exports/imports to break the circular dependency
   - Exported GraphQL API ID and URL from the API stack
   - Imported GraphQL API in the AI Advocate stack using these exports
   - Updated the AIAdvocateResolverConstruct to work with IGraphqlApi interface
   - Removed direct API reference from app.ts

## Current Status

All four phases have been completed successfully. The AI advocate system now generates personalized greetings for recruiters without relying on the job matching stack. We've removed the job matching stack completely, updated all references to it in the codebase, and fixed circular dependencies between stacks.

The migration is now complete, and the system is fully migrated to use the AI advocate system for greetings.

## Summary of Changes

1. **Enhanced AI Advocate System**:
   - Added greeting generation capability to the AI advocate system
   - Created comprehensive tests for the greeting functionality
   - Improved type safety with proper TypeScript interfaces

2. **Simplified Data Access**:
   - Removed fallback to job matching table
   - Removed unused resolver functions
   - Streamlined data access patterns

3. **Removed Job Matching Stack**:
   - Created RecruiterProfiles table in the AI Advocate stack
   - Instantiated the AI Advocate stack in the CDK app
   - Updated all stack dependencies
   - Removed unused GraphQL resolver
   - Updated frontend hooks to use the new system

4. **Fixed Circular Dependencies**:
   - Used CloudFormation exports/imports to break circular dependencies
   - Exported GraphQL API from API stack
   - Imported GraphQL API in AI Advocate stack
   - Updated resolver constructs to work with imported API

5. **Development Experience**:
   - Ensured the `useAdvocateGreetingDev` hook works correctly for local development
   - Maintained the local interceptor for testing without authentication

This migration has successfully simplified the architecture while maintaining all functionality.
