import { vi } from 'vitest';

// Mock process.exit to prevent tests from actually exiting
const originalExit = process.exit;
process.exit = vi.fn() as any;

// Restore original exit after tests
afterAll(() => {
  process.exit = originalExit;
}); 