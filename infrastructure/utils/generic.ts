/**
 * Generic utility functions
 */

/**
 * Convert PascalCase to SCREAMING_SNAKE_CASE
 * Example: 'AppsyncApiKey' -> 'APPSYNC_API_KEY'
 */
export function pascalToScreamingSnake(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toUpperCase()
    .replace(/^_/, '');
}

/**
 * Convert SNAKE_CASE to camelCase
 * Example: 'API_KEY' -> 'apiKey'
 */
export function toCamelCase(str: string): string {
  return str.toLowerCase().replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}
