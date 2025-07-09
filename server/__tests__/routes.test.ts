import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import session from 'express-session';
import { registerRoutes } from '../routes';
import { mongoStorage } from '../mongo-storage';
import { hashPassword } from '../auth';
import { EventEmitter } from 'events';

// Mock delle dipendenze
vi.mock('../mongo-storage', () => {
  class SessionStoreMock extends EventEmitter {
    get = vi.fn();
    set = vi.fn();
    destroy = vi.fn();
    all = vi.fn();
    length = vi.fn();
    clear = vi.fn();
    touch = vi.fn();
  }
  return {
    mongoStorage: {
      getUserByEmail: vi.fn(),
      getUser: vi.fn(),
      getClient: vi.fn(),
      getDocument: vi.fn(),
      createDocument: vi.fn(),
      updateDocument: vi.fn(),
      markDocumentObsolete: vi.fn(),
      getDocumentsByClientId: vi.fn(),
      getObsoleteDocumentsByClientId: vi.fn(),
      getUsersByClientIdWithPagination: vi.fn(),
      createUser: vi.fn(),
      updateUserRole: vi.fn(),
      deleteUser: vi.fn(),
      updateUserPassword: vi.fn(),
      updateUserClient: vi.fn(),
      createClient: vi.fn(),
      updateClient: vi.fn(),
      getClientsByAdminId: vi.fn(),
      getPaginatedCompanyCodes: vi.fn(),
      createManyCompanyCodes: vi.fn(),
      getCompanyCode: vi.fn(),
      updateCompanyCode: vi.fn(),
      deleteCompanyCode: vi.fn(),
      getLogsByClientId: vi.fn(),
      createLog: vi.fn(),
      hashAndEncryptDocument: vi.fn(),
      verifyDocumentIntegrity: vi.fn(),
      sessionStore: new SessionStoreMock(),
    }
  };
});

vi.mock('../google-drive', () => ({
  syncWithGoogleDrive: vi.fn(),
  extractFolderIdFromUrl: vi.fn(() => 'test-folder-id')
}));

vi.mock('../secure-links', () => ({
  generateSecureLink: vi.fn(() => '/api/secure/test-data/test-expires/test-signature'),
  verifySecureLink: vi.fn()
}));

vi.mock('../mailer', () => ({
  handleContactRequest: vi.fn(),
  handlePasswordReset: vi.fn(),
  transporter: {
    sendMail: vi.fn()
  }
}));

