describe('Admin Configuration', () => {
  test('should load admin config structure', async () => {
    const { default: ADMIN_CONFIG } = await import('../../admin/lib/config.js');

    expect(ADMIN_CONFIG).toBeDefined();
    expect(ADMIN_CONFIG.regions).toBeDefined();
    expect(ADMIN_CONFIG.dataTypes).toBeDefined();
    expect(ADMIN_CONFIG.paths).toBeDefined();
  });

  test('should have all required data types', async () => {
    const { default: ADMIN_CONFIG } = await import('../../admin/lib/config.js');

    expect(ADMIN_CONFIG.dataTypes.developer).toBeDefined();
    expect(ADMIN_CONFIG.dataTypes.projects).toBeDefined();
    expect(ADMIN_CONFIG.dataTypes.recruiters).toBeDefined();

    expect(ADMIN_CONFIG.dataTypes.developer.isSingle).toBe(true);
    expect(ADMIN_CONFIG.dataTypes.projects.isSingle).toBe(false);
    expect(ADMIN_CONFIG.dataTypes.recruiters.isSingle).toBe(false);
  });
});
