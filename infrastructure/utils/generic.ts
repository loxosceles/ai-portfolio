/**
 * Generic utility functions
 */

/**
 * Convert PascalCase to SCREAMING_SNAKE_CASE
 * Example: 'AppSyncApiKey' -> 'APPSYNC_API_KEY'
 */
export function pascalToScreamingSnake(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toUpperCase()
    .replace(/^_/, '');
}
