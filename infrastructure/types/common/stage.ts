/**
 * Stage type and related constants
 */
export const SUPPORTED_STAGES = ['dev', 'prod'] as const;
export type Stage = (typeof SUPPORTED_STAGES)[number];
