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
function withEnv(env) {
  const prev = {};
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
async function loadModuleWithEnv(modulePath, env) {
  const restore = withEnv(env);
  jest.resetModules();
  const mod = await import(modulePath);
  return { mod, restore };
}

// Export for both CommonJS and ESM
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { withEnv, loadModuleWithEnv };
}

// For ESM environments, use named exports
export { withEnv, loadModuleWithEnv };
