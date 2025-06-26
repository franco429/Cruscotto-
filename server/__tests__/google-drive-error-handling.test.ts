import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { syncWithGoogleDrive, startAutomaticSync, stopAutomaticSync } from '../google-drive';
import { mongoStorage } from '../mongo-storage';
import logger from '../logger';

// Mock delle dipendenze
vi.mock('../mongo-storage');
vi.mock('../google-oauth');
vi.mock('../logger');
vi.mock('fs/promises');
vi.mock('path');
vi.mock('os');

describe('Google Drive Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock del logger
    vi.mocked(logger.info).mockImplementation(() => {});
    vi.mocked(logger.error).mockImplementation(() => {});
    vi.mocked(logger.warn).mockImplementation(() => {});
    vi.mocked(logger.debug).mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('syncWithGoogleDrive', () => {
    it('should handle user not found error gracefully', async () => {
      // Mock user not found
      vi.mocked(mongoStorage.getUser).mockResolvedValue(null);

      const result = await syncWithGoogleDrive('test-folder', 999);

      expect(result.success).toBe(false);
      expect(result.failed).toBe(0);
      expect(result.processed).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('USER_NOT_FOUND');
      expect(result.errors[0].retryable).toBe(false);
    });

    it('should handle Google Drive connection failure with retry', async () => {
      // Mock user exists but Google Drive fails
      vi.mocked(mongoStorage.getUser).mockResolvedValue({
        legacyId: 1,
        email: 'test@example.com',
        password: 'hashed',
        role: 'admin',
        clientId: 1,
        lastLogin: new Date(),
        sessionExpiry: new Date(),
        createdAt: new Date(),
        failedLoginAttempts: 0,
        lockoutUntil: null
      });

      // Mock Google Drive client failure
      const mockDriveClient = {
        files: {
          list: vi.fn().mockRejectedValue(new Error('Connection failed'))
        }
      };

      const { getDriveClientForClient } = await import('../google-oauth');
      vi.mocked(getDriveClientForClient).mockResolvedValue(mockDriveClient);

      const result = await syncWithGoogleDrive('test-folder', 1);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('DRIVE_CONNECTION_FAILED');
      expect(result.errors[0].retryable).toBe(true);
    });

    it('should handle file processing errors without stopping the entire sync', async () => {
      // Mock successful setup
      vi.mocked(mongoStorage.getUser).mockResolvedValue({
        legacyId: 1,
        email: 'test@example.com',
        password: 'hashed',
        role: 'admin',
        clientId: 1,
        lastLogin: new Date(),
        sessionExpiry: new Date(),
        createdAt: new Date(),
        failedLoginAttempts: 0,
        lockoutUntil: null
      });

      const mockDriveClient = {
        files: {
          list: vi.fn().mockResolvedValue({
            data: {
              files: [
                { id: 'file1', name: 'test1.pdf', webViewLink: 'http://test1' },
                { id: 'file2', name: 'test2.pdf', webViewLink: 'http://test2' }
              ]
            }
          })
        }
      };

      const { getDriveClientForClient } = await import('../google-oauth');
      vi.mocked(getDriveClientForClient).mockResolvedValue(mockDriveClient);

      // Mock file download to fail for one file
      const { googleDriveDownloadFile } = await import('../google-drive');
      vi.mocked(googleDriveDownloadFile)
        .mockResolvedValueOnce(undefined) // First file succeeds
        .mockRejectedValueOnce(new Error('Download failed')); // Second file fails

      const result = await syncWithGoogleDrive('test-folder', 1);

      expect(result.processed).toBeGreaterThan(0);
      expect(result.failed).toBeGreaterThan(0);
      expect(result.errors.length).toBeGreaterThan(0);
      // The sync should continue even with some failures
      expect(result.success).toBe(false);
    });

    it('should implement exponential backoff for retries', async () => {
      // Mock user exists
      vi.mocked(mongoStorage.getUser).mockResolvedValue({
        legacyId: 1,
        email: 'test@example.com',
        password: 'hashed',
        role: 'admin',
        clientId: 1,
        lastLogin: new Date(),
        sessionExpiry: new Date(),
        createdAt: new Date(),
        failedLoginAttempts: 0,
        lockoutUntil: null
      });

      // Mock Google Drive to fail multiple times then succeed
      let callCount = 0;
      const mockDriveClient = {
        files: {
          list: vi.fn().mockImplementation(() => {
            callCount++;
            if (callCount < 3) {
              throw new Error('Temporary failure');
            }
            return Promise.resolve({ data: { files: [] } });
          })
        }
      };

      const { getDriveClientForClient } = await import('../google-oauth');
      vi.mocked(getDriveClientForClient).mockResolvedValue(mockDriveClient);

      const startTime = Date.now();
      const result = await syncWithGoogleDrive('test-folder', 1);
      const duration = Date.now() - startTime;

      // Should have retried multiple times
      expect(callCount).toBe(3);
      // Should have taken some time due to backoff delays
      expect(duration).toBeGreaterThan(1000);
      expect(result.success).toBe(true);
    });
  });

  describe('Automatic Sync', () => {
    it('should handle automatic sync errors gracefully', async () => {
      // Mock syncWithGoogleDrive to fail
      vi.mocked(syncWithGoogleDrive).mockResolvedValue({
        success: false,
        processed: 0,
        failed: 5,
        errors: [
          {
            message: 'Test error',
            code: 'TEST_ERROR',
            retryable: true,
            context: {}
          } as any
        ],
        duration: 1000
      });

      // Start automatic sync
      startAutomaticSync('test-folder', 1);

      // Wait a bit for the sync to run
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should have logged the error
      expect(logger.error).toHaveBeenCalledWith(
        'Automatic sync failed',
        expect.objectContaining({
          userId: 1,
          syncFolder: 'test-folder'
        })
      );

      // Clean up
      stopAutomaticSync(1);
    });

    it('should increase sync interval on high failure rate', async () => {
      // Mock high failure rate
      vi.mocked(syncWithGoogleDrive).mockResolvedValue({
        success: false,
        processed: 1,
        failed: 10, // More failures than successes
        errors: [],
        duration: 1000
      });

      // Start automatic sync
      startAutomaticSync('test-folder', 1);

      // Wait for the sync to run and interval adjustment
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should have logged the warning about high failure rate
      expect(logger.warn).toHaveBeenCalledWith(
        'High failure rate detected, increasing sync interval',
        expect.objectContaining({
          userId: 1,
          processed: 1,
          failed: 10
        })
      );

      // Clean up
      stopAutomaticSync(1);
    });
  });

  describe('Error Classification', () => {
    it('should correctly classify retryable vs non-retryable errors', async () => {
      // Test user not found (non-retryable)
      vi.mocked(mongoStorage.getUser).mockResolvedValue(null);
      
      let result = await syncWithGoogleDrive('test-folder', 999);
      expect(result.errors[0].retryable).toBe(false);

      // Test connection failure (retryable)
      vi.mocked(mongoStorage.getUser).mockResolvedValue({
        legacyId: 1,
        email: 'test@example.com',
        password: 'hashed',
        role: 'admin',
        clientId: 1,
        lastLogin: new Date(),
        sessionExpiry: new Date(),
        createdAt: new Date(),
        failedLoginAttempts: 0,
        lockoutUntil: null
      });

      const mockDriveClient = {
        files: {
          list: vi.fn().mockRejectedValue(new Error('Network error'))
        }
      };

      const { getDriveClientForClient } = await import('../google-oauth');
      vi.mocked(getDriveClientForClient).mockResolvedValue(mockDriveClient);

      result = await syncWithGoogleDrive('test-folder', 1);
      expect(result.errors[0].retryable).toBe(true);
    });
  });
}); 