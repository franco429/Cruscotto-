import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import * as crypto from 'crypto';
import { mongoStorage } from '../mongo-storage';

// Funzione helper per calcolare hash
async function calculateFileHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    
    stream.on('error', reject);
    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

// Funzione helper per creare file di test
function createTestExcelFile(filePath: string, content: string): void {
  // Crea un file Excel semplice con contenuto specificato
  const excelContent = `A1,${content}\nB1,Test Data\n`;
  fs.writeFileSync(filePath, excelContent);
}

describe('Local Upload Smart Update Functionality', () => {
  let tempDir: string;
  let testClientId: number;
  let testUserId: number;

  beforeAll(async () => {
    // Setup test environment
    await mongoStorage.connect();
    
    // Create test client and user
    const testClient = await mongoStorage.createClient({
      name: 'Test Client for Upload Update',
      driveFolderId: '',
    });
    testClientId = testClient.legacyId;

    const testUser = await mongoStorage.createUser({
      email: 'test-upload@example.com',
      passwordHash: 'test-hash',
      isAdmin: true,
      companyCode: 'TEST001',
      clientId: testClientId,
    });
    testUserId = testUser.legacyId;

    // Create temp directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'upload-test-'));
  });

  afterAll(async () => {
    // Cleanup test data
    try {
      const testDocuments = await mongoStorage.getAllDocuments();
      const clientDocs = testDocuments.filter(d => d.clientId === testClientId);
      for (const doc of clientDocs) {
        await mongoStorage.deleteDocument(doc.legacyId);
      }
      
      await mongoStorage.deleteUser(testUserId);
      await mongoStorage.deleteClient(testClientId);
    } catch (error) {
      console.error('Cleanup error:', error);
    }

    // Remove temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }

    await mongoStorage.disconnect();
  });

  beforeEach(() => {
    // Clean up any existing test files before each test
    const files = fs.readdirSync(tempDir);
    files.forEach(file => {
      fs.unlinkSync(path.join(tempDir, file));
    });
  });

  it('should create new document with hash for new file', async () => {
    const fileName = '10.2.3_Test Document_Rev.1_2025-12-31.xlsx';
    const filePath = path.join(tempDir, fileName);
    
    createTestExcelFile(filePath, '2025-12-31');
    const expectedHash = await calculateFileHash(filePath);

    // Simula processamento come nuovo documento
    const docInfo = {
      title: 'Test Document',
      path: '10.2.3',
      revision: 'Rev.1',
      driveUrl: '',
      fileType: 'xlsx',
      alertStatus: 'warning' as const,
      expiryDate: new Date('2025-12-31'),
      isObsolete: false,
      parentId: null,
      encryptedCachePath: null,
      ownerId: testUserId,
      clientId: testClientId,
      googleFileId: null,
      fileHash: expectedHash,
    };

    const createdDoc = await mongoStorage.createDocument(docInfo);

    expect(createdDoc).toBeDefined();
    expect(createdDoc.fileHash).toBe(expectedHash);
    expect(createdDoc.alertStatus).toBe('warning');
    expect(createdDoc.expiryDate).toEqual(new Date('2025-12-31'));
  });

  it('should skip update when file content is unchanged', async () => {
    const fileName = '10.2.4_Unchanged Document_Rev.1_2025-12-31.xlsx';
    const filePath = path.join(tempDir, fileName);
    
    createTestExcelFile(filePath, '2025-12-31');
    const fileHash = await calculateFileHash(filePath);

    // Crea documento iniziale
    const docInfo = {
      title: 'Unchanged Document',
      path: '10.2.4',
      revision: 'Rev.1',
      driveUrl: '',
      fileType: 'xlsx',
      alertStatus: 'warning' as const,
      expiryDate: new Date('2025-12-31'),
      isObsolete: false,
      parentId: null,
      encryptedCachePath: null,
      ownerId: testUserId,
      clientId: testClientId,
      googleFileId: null,
      fileHash,
    };

    const originalDoc = await mongoStorage.createDocument(docInfo);
    const originalUpdatedAt = originalDoc.updatedAt;

    // Attendi un millisecond per assicurarsi che updatedAt sia diverso se cambiasse
    await new Promise(resolve => setTimeout(resolve, 10));

    // Verifica che esiste già un documento
    const existing = await mongoStorage.getDocumentByPathAndTitleAndRevision(
      docInfo.path,
      docInfo.title,
      docInfo.revision,
      testClientId
    );

    expect(existing).toBeDefined();
    expect(existing!.fileHash).toBe(fileHash);

    // Simula il controllo che farebbe il sistema - stesso hash = nessun aggiornamento necessario
    const newFileHash = await calculateFileHash(filePath);
    const hasFileChanged = !existing!.fileHash || existing!.fileHash !== newFileHash;
    
    expect(hasFileChanged).toBe(false);
    expect(existing!.updatedAt).toEqual(originalUpdatedAt);
  });

  it('should update document when file content changes', async () => {
    const fileName = '10.2.5_Changed Document_Rev.1_2025-12-31.xlsx';
    const filePath = path.join(tempDir, fileName);
    
    // Crea file iniziale
    createTestExcelFile(filePath, '2025-12-31');
    const originalHash = await calculateFileHash(filePath);

    // Crea documento iniziale
    const docInfo = {
      title: 'Changed Document',
      path: '10.2.5',
      revision: 'Rev.1',
      driveUrl: '',
      fileType: 'xlsx',
      alertStatus: 'warning' as const,
      expiryDate: new Date('2025-12-31'),
      isObsolete: false,
      parentId: null,
      encryptedCachePath: null,
      ownerId: testUserId,
      clientId: testClientId,
      googleFileId: null,
      fileHash: originalHash,
    };

    const originalDoc = await mongoStorage.createDocument(docInfo);

    // Attendi un po' per assicurarsi che updatedAt sia diverso
    await new Promise(resolve => setTimeout(resolve, 10));

    // Modifica il file (nuova data di scadenza)
    createTestExcelFile(filePath, '2026-01-15');
    const newHash = await calculateFileHash(filePath);

    expect(newHash).not.toBe(originalHash); // Verifica che l'hash sia davvero diverso

    // Simula aggiornamento con nuovi dati
    const updateData = {
      alertStatus: 'none' as const,
      expiryDate: new Date('2026-01-15'),
      fileHash: newHash,
    };

    const updatedDoc = await mongoStorage.updateDocument(originalDoc.legacyId, updateData);

    expect(updatedDoc).toBeDefined();
    expect(updatedDoc!.fileHash).toBe(newHash);
    expect(updatedDoc!.alertStatus).toBe('none');
    expect(updatedDoc!.expiryDate).toEqual(new Date('2026-01-15'));
    expect(updatedDoc!.updatedAt.getTime()).toBeGreaterThan(originalDoc.updatedAt.getTime());
  });

  it('should handle hash calculation for missing hash in existing document', async () => {
    const fileName = '10.2.6_Legacy Document_Rev.1_2025-12-31.xlsx';
    const filePath = path.join(tempDir, fileName);
    
    createTestExcelFile(filePath, '2025-12-31');

    // Crea documento senza hash (simula documento legacy)
    const docInfo = {
      title: 'Legacy Document',
      path: '10.2.6',
      revision: 'Rev.1',
      driveUrl: '',
      fileType: 'xlsx',
      alertStatus: 'warning' as const,
      expiryDate: new Date('2025-12-31'),
      isObsolete: false,
      parentId: null,
      encryptedCachePath: null,
      ownerId: testUserId,
      clientId: testClientId,
      googleFileId: null,
      fileHash: null, // Documento legacy senza hash
    };

    const legacyDoc = await mongoStorage.createDocument(docInfo);

    // Verifica la logica di controllo cambiamento
    const newFileHash = await calculateFileHash(filePath);
    const hasFileChanged = !legacyDoc.fileHash || legacyDoc.fileHash !== newFileHash;
    
    // Dovrebbe sempre aggiornare quando fileHash è null (documento legacy)
    expect(hasFileChanged).toBe(true);

    // Aggiorna il documento legacy con il nuovo hash
    const updateData = {
      fileHash: newFileHash,
    };

    const updatedDoc = await mongoStorage.updateDocument(legacyDoc.legacyId, updateData);

    expect(updatedDoc).toBeDefined();
    expect(updatedDoc!.fileHash).toBe(newFileHash);
  });
});
