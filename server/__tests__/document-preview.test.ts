import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../routes';
import * as fs from 'fs';
import * as path from 'path';

describe('Document Preview Endpoints', () => {
  let app: express.Application;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    await registerRoutes(app);
  });

  afterEach(() => {
    // Cleanup
  });

  describe('GET /api/documents/:id/preview', () => {
    it('should return 401 for unauthenticated requests', async () => {
      const response = await request(app)
        .get('/api/documents/1/preview')
        .expect(401);
    });

    it('should return 404 for non-existent document', async () => {
      // Mock authentication
      const mockReq = { user: { legacyId: 1, clientId: 'test-client' } };
      app.use((req, res, next) => {
        req.user = mockReq.user;
        next();
      });

      const response = await request(app)
        .get('/api/documents/999999/preview')
        .expect(404);
      
      expect(response.body.message).toBe('Documento non trovato');
    });

    it('should return 400 for Google Drive documents', async () => {
      // Mock authentication and document
      const mockReq = { user: { legacyId: 1, clientId: 'test-client' } };
      app.use((req, res, next) => {
        req.user = mockReq.user;
        next();
      });

      // Mock storage.getDocument to return a Google Drive document
      const originalGetDocument = require('../mongo-storage').mongoStorage.getDocument;
      require('../mongo-storage').mongoStorage.getDocument = jest.fn().mockResolvedValue({
        legacyId: 1,
        title: 'Test Document',
        fileType: 'pdf',
        path: 'test.pdf',
        driveUrl: 'https://drive.google.com/file/d/123/view'
      });

      const response = await request(app)
        .get('/api/documents/1/preview')
        .expect(400);
      
      expect(response.body.message).toBe('Anteprima non disponibile per file Google Drive');

      // Restore original function
      require('../mongo-storage').mongoStorage.getDocument = originalGetDocument;
    });
  });

  describe('GET /api/documents/:id/download', () => {
    it('should return 401 for unauthenticated requests', async () => {
      const response = await request(app)
        .get('/api/documents/1/download')
        .expect(401);
    });

    it('should return 404 for non-existent document', async () => {
      // Mock authentication
      const mockReq = { user: { legacyId: 1, clientId: 'test-client' } };
      app.use((req, res, next) => {
        req.user = mockReq.user;
        next();
      });

      const response = await request(app)
        .get('/api/documents/999999/download')
        .expect(404);
      
      expect(response.body.message).toBe('Documento non trovato');
    });
  });
}); 