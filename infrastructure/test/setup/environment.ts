// Global default needed by most tests
process.env.ENVIRONMENT ??= 'test';

// Ensure AWS SDK clients constructed at import have a region
process.env.AWS_REGION_DISTRIB ??= 'us-east-1';
process.env.AWS_REGION_DEFAULT ??= 'eu-central-1';

// Disable SDK config/profile and IMDS lookups during tests
process.env.AWS_SDK_LOAD_CONFIG ??= '0';
process.env.AWS_EC2_METADATA_DISABLED ??= 'true';

// Utilities to scope environment variables to a single test/suite.
/** Temporarily set process.env keys. Returns a restore function. */
export function withEnv(env: Record<string, string | undefined>) {
  const prev: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(env)) {
    prev[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  return () => {
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  };
}

/** Reset module cache and import a module after applying env vars. */
export async function loadModuleWithEnv<T = unknown>(
  modulePath: string,
  env: Record<string, string | undefined>
): Promise<{ mod: T; restore: () => void }> {
  const restore = withEnv(env);
  jest.resetModules();
  const mod = (await import(modulePath)) as T;
  return { mod, restore };
}
