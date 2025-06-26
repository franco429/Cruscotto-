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

// describe('Routes API Tests', () => {
//   let app: express.Application;
//
//   beforeEach(async () => {
//     app = express();
//     app.use(express.json());
//     app.use(session({
//       secret: 'test-secret',
//       resave: false,
//       saveUninitialized: false,
//       store: mongoStorage.sessionStore
//     }));
//     
//     // Mock setupAuth
//     app.use((req, res, next) => {
//       req.isAuthenticated = () => true;
//       req.user = {
//         legacyId: 1,
//         email: 'test@example.com',
//         role: 'admin',
//         clientId: 1
//       };
//       next();
//     });
//     
//     await registerRoutes(app);
//   });
//
//   afterEach(() => {
//     vi.clearAllMocks();
//   });
//
//   describe('Document Endpoints', () => {
//     it('should get documents for authenticated user', async () => {
//       const mockDocuments = [
//         { legacyId: 1, title: 'Test Doc', clientId: 1 }
//       ];
//       vi.mocked(mongoStorage.getDocumentsByClientId).mockResolvedValue(mockDocuments);
//
//       const response = await request(app)
//         .get('/api/documents')
//         .expect(200);
//
//       expect(response.body).toEqual(mockDocuments);
//     });
//
//     it('should get obsolete documents for admin', async () => {
//       const mockDocuments = [
//         { legacyId: 1, title: 'Obsolete Doc', clientId: 1, isObsolete: true }
//       ];
//       vi.mocked(mongoStorage.getObsoleteDocumentsByClientId).mockResolvedValue(mockDocuments);
//
//       const response = await request(app)
//         .get('/api/documents/obsolete')
//         .expect(200);
//
//       expect(response.body).toEqual(mockDocuments);
//     });
//
//     it('should get specific document by ID', async () => {
//       const mockDocument = { legacyId: 1, title: 'Test Doc', clientId: 1 };
//       vi.mocked(mongoStorage.getDocument).mockResolvedValue(mockDocument);
//
//       const response = await request(app)
//         .get('/api/documents/1')
//         .expect(200);
//
//       expect(response.body).toEqual(mockDocument);
//     });
//
//     it('should return 404 for non-existent document', async () => {
//       vi.mocked(mongoStorage.getDocument).mockResolvedValue(undefined);
//
//       const response = await request(app)
//         .get('/api/documents/999')
//         .expect(404);
//
//       expect(response.body.message).toBe('Document not found');
//     });
//
//     it('should create new document', async () => {
//       const mockDocument = { legacyId: 1, title: 'New Doc', clientId: 1 };
//       vi.mocked(mongoStorage.createDocument).mockResolvedValue(mockDocument);
//       vi.mocked(mongoStorage.createLog).mockResolvedValue({} as any);
//
//       const response = await request(app)
//         .post('/api/documents')
//         .send({
//           title: 'New Doc',
//           path: '1.0',
//           revision: 'Rev.1',
//           driveUrl: 'https://drive.google.com/test',
//           fileType: 'pdf'
//         })
//         .expect(201);
//
//       expect(response.body).toEqual(mockDocument);
//     });
//
//     it('should update document', async () => {
//       const mockDocument = { legacyId: 1, title: 'Updated Doc', clientId: 1 };
//       vi.mocked(mongoStorage.getDocument).mockResolvedValue(mockDocument);
//       vi.mocked(mongoStorage.updateDocument).mockResolvedValue(mockDocument);
//       vi.mocked(mongoStorage.createLog).mockResolvedValue({} as any);
//
//       const response = await request(app)
//         .put('/api/documents/1')
//         .send({ title: 'Updated Doc' })
//         .expect(200);
//
//       expect(response.body).toEqual(mockDocument);
//     });
//
//     it('should mark document as obsolete', async () => {
//       const mockDocument = { legacyId: 1, title: 'Test Doc', clientId: 1 };
//       vi.mocked(mongoStorage.getDocument).mockResolvedValue(mockDocument);
//       vi.mocked(mongoStorage.markDocumentObsolete).mockResolvedValue(mockDocument);
//       vi.mocked(mongoStorage.createLog).mockResolvedValue({} as any);
//
//       const response = await request(app)
//         .delete('/api/documents/1')
//         .expect(200);
//
//       expect(response.body.message).toBe('Document marked as obsolete');
//     });
//   });
//
//   describe('User Management Endpoints', () => {
//     it('should get users with pagination', async () => {
//       const mockUsers = [
//         { legacyId: 1, email: 'user1@test.com', role: 'viewer' }
//       ];
//       vi.mocked(mongoStorage.getUsersByClientIdWithPagination).mockResolvedValue({
//         users: mockUsers,
//         total: 1
//       });
//
//       const response = await request(app)
//         .get('/api/users?page=1&limit=10')
//         .expect(200);
//
//       expect(response.body.users).toEqual(mockUsers);
//       expect(response.body.total).toBe(1);
//     });
//
//     it('should create new user', async () => {
//       const mockUser = { legacyId: 2, email: 'newuser@test.com', role: 'viewer' };
//       vi.mocked(mongoStorage.getUserByEmail).mockResolvedValue(undefined);
//       vi.mocked(mongoStorage.createUser).mockResolvedValue(mockUser);
//
//       const response = await request(app)
//         .post('/api/users')
//         .send({
//           email: 'newuser@test.com',
//           password: 'TestPassword123!',
//           role: 'viewer'
//         })
//         .expect(201);
//
//       expect(response.body.email).toBe('newuser@test.com');
//     });
//
//     it('should update user role', async () => {
//       const mockUser = { legacyId: 1, email: 'user@test.com', role: 'admin' };
//       vi.mocked(mongoStorage.updateUserRole).mockResolvedValue(mockUser);
//       vi.mocked(mongoStorage.createLog).mockResolvedValue({} as any);
//
//       const response = await request(app)
//         .patch('/api/users/1/role')
//         .send({ role: 'admin' })
//         .expect(200);
//
//       expect(response.body.role).toBe('admin');
//     });
//
//     it('should delete user', async () => {
//       const mockUser = { legacyId: 2, email: 'delete@test.com', clientId: 1 };
//       vi.mocked(mongoStorage.getUser).mockResolvedValue(mockUser);
//       vi.mocked(mongoStorage.deleteUser).mockResolvedValue(true);
//       vi.mocked(mongoStorage.createLog).mockResolvedValue({} as any);
//
//       const response = await request(app)
//         .delete('/api/users/2')
//         .expect(200);
//
//       expect(response.body.message).toBe('Utente eliminato con successo');
//     });
//
//     it('should prevent admin from deleting themselves', async () => {
//       const response = await request(app)
//         .delete('/api/users/1')
//         .expect(400);
//
//       expect(response.body.message).toBe('Non puoi eliminare il tuo stesso account');
//     });
//   });
//
//   describe('Client Management Endpoints', () => {
//     it('should get clients for admin', async () => {
//       const mockClients = [
//         { legacyId: 1, name: 'Test Client', driveFolderId: 'test-folder' }
//       ];
//       vi.mocked(mongoStorage.getClientsByAdminId).mockResolvedValue(mockClients);
//
//       const response = await request(app)
//         .get('/api/clients')
//         .expect(200);
//
//       expect(response.body).toEqual(mockClients);
//     });
//
//     it('should update client', async () => {
//       const mockClient = { legacyId: 1, name: 'Updated Client', driveFolderId: 'test-folder' };
//       vi.mocked(mongoStorage.getClient).mockResolvedValue(mockClient);
//       vi.mocked(mongoStorage.getClientsByAdminId).mockResolvedValue([mockClient]);
//       vi.mocked(mongoStorage.updateClient).mockResolvedValue(mockClient);
//       vi.mocked(mongoStorage.createLog).mockResolvedValue({} as any);
//
//       const response = await request(app)
//         .put('/api/clients/1')
//         .send({ name: 'Updated Client' })
//         .expect(200);
//
//       expect(response.body.name).toBe('Updated Client');
//     });
//   });
//
//   describe('Company Code Endpoints', () => {
//     it('should get paginated company codes', async () => {
//       const mockCodes = [
//         { legacyId: 1, code: 'TEST123', role: 'admin', isActive: true }
//       ];
//       vi.mocked(mongoStorage.getPaginatedCompanyCodes).mockResolvedValue({
//         data: mockCodes,
//         total: 1
//       });
//
//       const response = await request(app)
//         .get('/api/company-codes?page=1&limit=10')
//         .expect(200);
//
//       expect(response.body.data).toEqual(mockCodes);
//     });
//
//     it('should update company code', async () => {
//       const mockCode = { legacyId: 1, code: 'UPDATED123', role: 'admin', isActive: true };
//       vi.mocked(mongoStorage.getCompanyCode).mockResolvedValue(mockCode);
//       vi.mocked(mongoStorage.getCompanyCodeByCode).mockResolvedValue(undefined);
//       vi.mocked(mongoStorage.updateCompanyCode).mockResolvedValue(mockCode);
//       vi.mocked(mongoStorage.createLog).mockResolvedValue({} as any);
//
//       const response = await request(app)
//         .patch('/api/company-codes/1')
//         .send({ code: 'UPDATED123' })
//         .expect(200);
//
//       expect(response.body.code).toBe('UPDATED123');
//     });
//
//     it('should delete company code', async () => {
//       const mockCode = { legacyId: 1, code: 'DELETE123', role: 'admin', isActive: true };
//       vi.mocked(mongoStorage.getCompanyCode).mockResolvedValue(mockCode);
//       vi.mocked(mongoStorage.deleteCompanyCode).mockResolvedValue(true);
//       vi.mocked(mongoStorage.createLog).mockResolvedValue({} as any);
//
//       const response = await request(app)
//         .delete('/api/company-codes/1')
//         .expect(200);
//
//       expect(response.body.message).toBe('Codice aziendale eliminato con successo');
//     });
//   });
//
//   describe('Security Endpoints', () => {
//     it('should encrypt document', async () => {
//       const mockDocument = { legacyId: 1, title: 'Test Doc', encryptedCachePath: '/path/to/encrypted' };
//       vi.mocked(mongoStorage.getDocument).mockResolvedValue(mockDocument);
//       vi.mocked(mongoStorage.hashAndEncryptDocument).mockResolvedValue(mockDocument);
//       vi.mocked(mongoStorage.createLog).mockResolvedValue({} as any);
//
//       const response = await request(app)
//         .post('/api/documents/1/encrypt')
//         .send({ filePath: '/path/to/file.pdf' })
//         .expect(200);
//
//       expect(response.body.message).toBe('Documento criptato con successo');
//     });
//
//     it('should verify document integrity', async () => {
//       const mockDocument = { legacyId: 1, title: 'Test Doc', fileHash: 'hash123', encryptedCachePath: '/path/to/encrypted' };
//       vi.mocked(mongoStorage.getDocument).mockResolvedValue(mockDocument);
//       vi.mocked(mongoStorage.verifyDocumentIntegrity).mockResolvedValue(true);
//       vi.mocked(mongoStorage.createLog).mockResolvedValue({} as any);
//
//       const response = await request(app)
//         .get('/api/documents/1/verify')
//         .expect(200);
//
//       expect(response.body.status).toBe('valid');
//     });
//
//     it('should generate secure link', async () => {
//       const mockDocument = { legacyId: 1, title: 'Test Doc', clientId: 1 };
//       vi.mocked(mongoStorage.getDocument).mockResolvedValue(mockDocument);
//
//       const response = await request(app)
//         .post('/api/documents/1/share')
//         .send({ action: 'view', expiryHours: 24 })
//         .expect(200);
//
//       expect(response.body).toHaveProperty('shareLink');
//       expect(response.body.action).toBe('view');
//     });
//   });
//
//   describe('Contact Endpoint', () => {
//     it('should handle contact request', async () => {
//       const mockTransporter = require('../mailer').transporter;
//       vi.mocked(mockTransporter.sendMail).mockResolvedValue({ messageId: 'test-id' });
//
//       const response = await request(app)
//         .post('/api/contact')
//         .send({
//           name: 'Test User',
//           email: 'test@example.com',
//           message: 'Test message'
//         })
//         .expect(200);
//
//       expect(response.body.success).toBe(true);
//     });
//
//     it('should validate required fields for contact', async () => {
//       const response = await request(app)
//         .post('/api/contact')
//         .send({
//           name: 'Test User'
//           // Missing email and message
//         })
//         .expect(400);
//
//       expect(response.body.error).toBe('Tutti i campi sono obbligatori');
//     });
//   });
//
//   describe('Password Change Endpoint', () => {
//     it('should change user password', async () => {
//       const mockUser = { 
//         legacyId: 1, 
//         password: await hashPassword('OldPassword123!'),
//         clientId: 1 
//       };
//       vi.mocked(mongoStorage.getUser).mockResolvedValue(mockUser);
//       vi.mocked(mongoStorage.updateUserPassword).mockResolvedValue(mockUser);
//       vi.mocked(mongoStorage.createLog).mockResolvedValue({} as any);
//
//       const response = await request(app)
//         .post('/api/change-password')
//         .send({
//           currentPassword: 'OldPassword123!',
//           newPassword: 'NewPassword123!'
//         })
//         .expect(200);
//
//       expect(response.body.message).toBe('Password aggiornata con successo');
//     });
//
//     it('should reject incorrect current password', async () => {
//       const mockUser = { 
//         legacyId: 1, 
//         password: await hashPassword('CorrectPassword123!'),
//         clientId: 1 
//       };
//       vi.mocked(mongoStorage.getUser).mockResolvedValue(mockUser);
//
//       const response = await request(app)
//         .post('/api/change-password')
//         .send({
//           currentPassword: 'WrongPassword123!',
//           newPassword: 'NewPassword123!'
//         })
//         .expect(401);
//
//       expect(response.body.message).toBe('La password attuale non è corretta');
//     });
//
//     it('should reject weak new password', async () => {
//       const mockUser = { 
//         legacyId: 1, 
//         password: await hashPassword('OldPassword123!'),
//         clientId: 1 
//       };
//       vi.mocked(mongoStorage.getUser).mockResolvedValue(mockUser);
//
//       const weakPasswords = [
//         '12345678', // solo numeri
//         'abcdefgh', // solo lettere minuscole
//         'ABCDEFGH', // solo lettere maiuscole
//         'abc123',   // troppo corta
//         'password', // senza caratteri speciali
//         'Password', // senza numeri
//         'Password1', // senza caratteri speciali
//       ];
//
//       for (const weakPassword of weakPasswords) {
//         const response = await request(app)
//           .post('/api/change-password')
//           .send({
//             currentPassword: 'OldPassword123!',
//             newPassword: weakPassword
//           })
//           .expect(400);
//
//         expect(response.body.message).toBe('Dati di cambio password non validi.');
//         expect(response.body.errors).toBeDefined();
//       }
//     });
//
//     it('should reject new password same as current', async () => {
//       const mockUser = { 
//         legacyId: 1, 
//         password: await hashPassword('CurrentPassword123!'),
//         clientId: 1 
//       };
//       vi.mocked(mongoStorage.getUser).mockResolvedValue(mockUser);
//
//       const response = await request(app)
//         .post('/api/change-password')
//         .send({
//           currentPassword: 'CurrentPassword123!',
//           newPassword: 'CurrentPassword123!'
//         })
//         .expect(400);
//
//       expect(response.body.message).toBe('La nuova password deve essere diversa da quella attuale');
//     });
//
//     it('should accept strong new password', async () => {
//       const mockUser = { 
//         legacyId: 1, 
//         password: await hashPassword('OldPassword123!'),
//         clientId: 1 
//       };
//       vi.mocked(mongoStorage.getUser).mockResolvedValue(mockUser);
//       vi.mocked(mongoStorage.updateUserPassword).mockResolvedValue(mockUser);
//       vi.mocked(mongoStorage.createLog).mockResolvedValue({} as any);
//
//       const strongPasswords = [
//         'NewPassword123!',
//         'SecurePass456@',
//         'StrongPwd789$',
//         'ComplexPass321%',
//       ];
//
//       for (const strongPassword of strongPasswords) {
//         const response = await request(app)
//           .post('/api/change-password')
//           .send({
//             currentPassword: 'OldPassword123!',
//             newPassword: strongPassword
//           })
//           .expect(200);
//
//         expect(response.body.message).toBe('Password aggiornata con successo');
//       }
//     });
//   });
//
//   describe('Sync Endpoint', () => {
//     it('should start Google Drive sync', async () => {
//       const mockClient = { legacyId: 1, name: 'Test Client', driveFolderId: 'test-folder' };
//       vi.mocked(mongoStorage.getClient).mockResolvedValue(mockClient);
//
//       const response = await request(app)
//         .post('/api/sync')
//         .expect(200);
//
//       expect(response.body.message).toBe('Processo di sincronizzazione avviato');
//     });
//
//     it('should handle missing client configuration', async () => {
//       vi.mocked(mongoStorage.getClient).mockResolvedValue(undefined);
//
//       const response = await request(app)
//         .post('/api/sync')
//         .expect(400);
//
//       expect(response.body.message).toBe('Cartella di sincronizzazione non configurata.');
//     });
//   });
//
//   describe('Audit Logs Endpoint', () => {
//     it('should get audit logs for client', async () => {
//       const mockLogs = [
//         { legacyId: 1, action: 'login', userId: 1, timestamp: new Date() }
//       ];
//       vi.mocked(mongoStorage.getLogsByClientId).mockResolvedValue(mockLogs);
//
//       const response = await request(app)
//         .get('/api/logs')
//         .expect(200);
//
//       expect(response.body).toEqual(mockLogs);
//     });
//   });
// }); 