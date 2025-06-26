import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { 
  encryptFile, 
  decryptFile, 
  hashFile, 
  verifyFileIntegrity 
} from '../crypto';

// Mock fs
vi.mock('fs', () => {
  const readFile = vi.fn();
  const writeFile = vi.fn();
  const mkdir = vi.fn();
  const unlink = vi.fn();
  const existsSync = vi.fn();
  return {
    readFile,
    writeFile,
    mkdir,
    unlink,
    existsSync,
    default: {
      promises: {
        readFile,
        writeFile,
        mkdir,
        unlink
      },
      existsSync
    }
  };
});

vi.mock('path', () => {
  const dirname = vi.fn();
  const basename = vi.fn();
  return {
    dirname,
    basename,
    default: {
      dirname,
      basename
    }
  };
});

// Mock process.env and process.exit
const originalEnv = process.env;
const originalExit = process.exit;

describe('Crypto Module Tests', () => {
  const testData = Buffer.from('Test file content for encryption');
  const testFilePath = '/test/source/file.txt';
  const testDestPath = '/test/dest/encrypted.enc';

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    vi.mocked(fs.promises.readFile).mockResolvedValue(testData);
    vi.mocked(fs.promises.writeFile).mockResolvedValue();
    vi.mocked(fs.promises.mkdir).mockResolvedValue();
    vi.mocked(path.dirname).mockReturnValue('/test/dest');
    
    // Reset environment
    process.env = { ...originalEnv };
    process.exit = vi.fn() as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
    process.env = originalEnv;
    process.exit = originalExit;
  });

  describe('Encryption Key Validation', () => {
    it('should exit with error in production when ENCRYPTION_KEY is missing', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.ENCRYPTION_KEY;
      
      // Re-import the module to trigger validation
      vi.resetModules();
      expect(() => require('../crypto')).toThrow();
    });

    it('should exit with error in production when ENCRYPTION_KEY is too short', () => {
      process.env.NODE_ENV = 'production';
      process.env.ENCRYPTION_KEY = 'short';
      
      // Re-import the module to trigger validation
      vi.resetModules();
      expect(() => require('../crypto')).toThrow();
    });

    it('should allow auto-generation in development when ENCRYPTION_KEY is missing', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.ENCRYPTION_KEY;
      
      // Mock console.warn to capture warnings
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Re-import the module to trigger validation
      vi.resetModules();
      expect(() => require('../crypto')).not.toThrow();
      
      // Should show warning
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('WARNING: ENCRYPTION_KEY not set')
      );
      
      consoleSpy.mockRestore();
    });

    it('should accept valid ENCRYPTION_KEY in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.ENCRYPTION_KEY = 'a'.repeat(32); // 32 characters
      
      // Re-import the module to trigger validation
      vi.resetModules();
      expect(() => require('../crypto')).not.toThrow();
    });
  });

  describe('File Encryption', () => {
    it('should encrypt file successfully', async () => {
      const result = await encryptFile(testFilePath, testDestPath);

      expect(result).toBe(testDestPath);
      expect(fs.promises.mkdir).toHaveBeenCalledWith('/test/dest', { recursive: true });
      expect(fs.promises.readFile).toHaveBeenCalledWith(testFilePath);
      expect(fs.promises.writeFile).toHaveBeenCalledWith(testDestPath, expect.any(Buffer));
    });

    it('should create directory if it does not exist', async () => {
      await encryptFile(testFilePath, testDestPath);

      expect(fs.promises.mkdir).toHaveBeenCalledWith('/test/dest', { recursive: true });
    });

    it('should handle read file errors', async () => {
      vi.mocked(fs.promises.readFile).mockRejectedValue(new Error('Read error'));

      await expect(encryptFile(testFilePath, testDestPath)).rejects.toThrow('Read error');
    });

    it('should handle write file errors', async () => {
      vi.mocked(fs.promises.writeFile).mockRejectedValue(new Error('Write error'));

      await expect(encryptFile(testFilePath, testDestPath)).rejects.toThrow('Write error');
    });

    it('should generate different encrypted content for same input', async () => {
      const encrypted1 = await encryptFile(testFilePath, testDestPath);
      const encrypted2 = await encryptFile(testFilePath, testDestPath + '2');

      // Get the written data from the mocks
      const writeCalls = vi.mocked(fs.promises.writeFile).mock.calls;
      const data1 = writeCalls[0][1] as Buffer;
      const data2 = writeCalls[1][1] as Buffer;

      // The encrypted data should be different due to different IVs
      expect(data1).not.toEqual(data2);
    });
  });

  describe('File Decryption', () => {
    it('should decrypt file successfully', async () => {
      // First encrypt
      await encryptFile(testFilePath, testDestPath);
      
      // Get the encrypted data
      const writeCalls = vi.mocked(fs.promises.writeFile).mock.calls;
      const encryptedData = writeCalls[0][1] as Buffer;
      
      // Mock read for decryption
      vi.mocked(fs.promises.readFile).mockResolvedValue(encryptedData);

      const result = await decryptFile(testDestPath);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString()).toBe(testData.toString());
    });

    it('should decrypt file to destination path', async () => {
      // First encrypt
      await encryptFile(testFilePath, testDestPath);
      
      // Get the encrypted data
      const writeCalls = vi.mocked(fs.promises.writeFile).mock.calls;
      const encryptedData = writeCalls[0][1] as Buffer;
      
      // Mock read for decryption
      vi.mocked(fs.promises.readFile).mockResolvedValue(encryptedData);

      const destPath = '/test/decrypted/file.txt';
      const result = await decryptFile(testDestPath, destPath);

      expect(result).toBe(destPath);
      expect(fs.promises.writeFile).toHaveBeenCalledWith(destPath, testData);
    });

    it('should handle corrupted encrypted file', async () => {
      const corruptedData = Buffer.from('corrupted data');
      vi.mocked(fs.promises.readFile).mockResolvedValue(corruptedData);

      await expect(decryptFile(testDestPath)).rejects.toThrow();
    });

    it('should handle read errors during decryption', async () => {
      vi.mocked(fs.promises.readFile).mockRejectedValue(new Error('Read error'));

      await expect(decryptFile(testDestPath)).rejects.toThrow('Read error');
    });
  });

  describe('File Hashing', () => {
    it('should generate consistent hash for same content', async () => {
      const hash1 = await hashFile(testFilePath);
      const hash2 = await hashFile(testFilePath);

      expect(hash1).toBe(hash2);
      expect(typeof hash1).toBe('string');
      expect(hash1.length).toBe(64); // SHA-256 hash length
    });

    it('should generate different hashes for different content', async () => {
      const differentData = Buffer.from('Different content');
      vi.mocked(fs.promises.readFile)
        .mockResolvedValueOnce(testData)
        .mockResolvedValueOnce(differentData);

      const hash1 = await hashFile(testFilePath);
      const hash2 = await hashFile(testFilePath);

      expect(hash1).not.toBe(hash2);
    });

    it('should handle read errors during hashing', async () => {
      vi.mocked(fs.promises.readFile).mockRejectedValue(new Error('Read error'));

      await expect(hashFile(testFilePath)).rejects.toThrow('Read error');
    });
  });

  describe('File Integrity Verification', () => {
    it('should verify file integrity successfully', async () => {
      const hash = await hashFile(testFilePath);
      
      const result = await verifyFileIntegrity(testFilePath, hash);

      expect(result).toBe(true);
    });

    it('should fail verification for different content', async () => {
      const hash = await hashFile(testFilePath);
      
      // Mock different content for verification
      const differentData = Buffer.from('Different content');
      vi.mocked(fs.promises.readFile).mockResolvedValue(differentData);

      const result = await verifyFileIntegrity(testFilePath, hash);

      expect(result).toBe(false);
    });

    it('should fail verification for invalid hash', async () => {
      const invalidHash = 'invalid-hash';
      
      const result = await verifyFileIntegrity(testFilePath, invalidHash);

      expect(result).toBe(false);
    });

    it('should handle read errors during verification', async () => {
      vi.mocked(fs.promises.readFile).mockRejectedValue(new Error('Read error'));

      await expect(verifyFileIntegrity(testFilePath, 'test-hash')).rejects.toThrow('Read error');
    });
  });

  describe('Encryption Key Management', () => {
    it('should use environment variable for encryption key', () => {
      const originalEnv = process.env.ENCRYPTION_KEY;
      process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-long';

      // Re-import to test with new env var
      const cryptoModule = require('../crypto');
      
      expect(cryptoModule).toBeDefined();

      // Restore original env
      process.env.ENCRYPTION_KEY = originalEnv;
    });

    it('should generate random key if ENCRYPTION_KEY not provided', () => {
      const originalEnv = process.env.ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_KEY;

      // Re-import to test with no env var
      const cryptoModule = require('../crypto');
      
      expect(cryptoModule).toBeDefined();

      // Restore original env
      process.env.ENCRYPTION_KEY = originalEnv;
    });
  });

  describe('End-to-End Encryption/Decryption', () => {
    it('should successfully encrypt and decrypt a file', async () => {
      // Encrypt
      await encryptFile(testFilePath, testDestPath);
      
      // Get encrypted data
      const writeCalls = vi.mocked(fs.promises.writeFile).mock.calls;
      const encryptedData = writeCalls[0][1] as Buffer;
      
      // Mock read for decryption
      vi.mocked(fs.promises.readFile).mockResolvedValue(encryptedData);

      // Decrypt
      const decryptedData = await decryptFile(testDestPath);

      // Verify original and decrypted are the same
      expect(decryptedData.toString()).toBe(testData.toString());
    });

    it('should maintain file integrity through encryption/decryption cycle', async () => {
      // Get original hash
      const originalHash = await hashFile(testFilePath);
      
      // Encrypt
      await encryptFile(testFilePath, testDestPath);
      
      // Get encrypted data
      const writeCalls = vi.mocked(fs.promises.writeFile).mock.calls;
      const encryptedData = writeCalls[0][1] as Buffer;
      
      // Mock read for decryption
      vi.mocked(fs.promises.readFile).mockResolvedValue(encryptedData);

      // Decrypt
      const decryptedData = await decryptFile(testDestPath);
      
      // Write decrypted data to temp file for hashing
      const tempPath = '/temp/decrypted.txt';
      vi.mocked(fs.promises.writeFile).mockResolvedValue();
      vi.mocked(fs.promises.readFile).mockResolvedValue(decryptedData);
      
      // Verify integrity
      const decryptedHash = await hashFile(tempPath);
      expect(decryptedHash).toBe(originalHash);
    });
  });
}); 