export default {
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    env: {
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
      VITE_ENABLE_VERBOSE_LOGS: 'false'
    },
    coverage: {
      include: ['core/**/*.js']
    }
  }
};
