import { SSM_PARAMETER_PREFIX } from '../configs/base';

export function buildSSMPath(stage: string, ...segments: string[]): string {
  return `/${SSM_PARAMETER_PREFIX}/${stage}${segments.length ? '/' + segments.join('/') : ''}`;
}
