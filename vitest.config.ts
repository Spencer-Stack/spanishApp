import { defineConfig } from 'vitest/config';

// Deliberately separate from vite.config.ts — the app build needs the
// React/Tailwind plugins, the (logic-only) test suite doesn't.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
