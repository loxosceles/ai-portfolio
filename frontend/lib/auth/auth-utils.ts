'use client';

import type { Environment } from './auth-context';

/**
 * Utility functions for authentication
 */

/**
 * Get the current environment
 * Uses NEXT_PUBLIC_ENVIRONMENT for static deployments
 */
export function getEnvironment(): Environment {
  return (process.env.NEXT_PUBLIC_ENVIRONMENT as Environment) || 'local';
}

/**
 * Check if we're in local development mode
 */
export function isLocalEnvironment(): boolean {
  return getEnvironment() === 'local';
}
