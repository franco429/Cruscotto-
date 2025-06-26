import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyzeExcelContent } from '../google-drive';
import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Mock ExcelJS
vi.mock('exceljs', () => ({
  default: {
    Workbook: vi.fn().mockImplementation(() => ({
      xlsx: {
        readFile: vi.fn()
      },
      getWorksheet: vi.fn()
    }))
  }
}));

describe('Excel Analysis Tests', () => {
  let mockWorkbook: any;
  let mockWorksheet: any;
  let mockCell: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Setup mock cell
    mockCell = {
      value: null
    };

    // Setup mock worksheet
    mockWorksheet = {
      getCell: vi.fn().mockReturnValue(mockCell)
    };

    // Setup mock workbook
    mockWorkbook = {
      xlsx: {
        readFile: vi.fn().mockResolvedValue(undefined)
      },
      getWorksheet: vi.fn().mockReturnValue(mockWorksheet)
    };

    (ExcelJS.Workbook as any).mockImplementation(() => mockWorkbook);
  });

  it('should return none status when cell A1 is empty', async () => {
    mockCell.value = null;

    const result = await analyzeExcelContent('/test/path/file.xlsx');

    expect(result).toEqual({
      alertStatus: 'none',
      expiryDate: null
    });
  });

  it('should parse date from string format DD/MM/YYYY', async () => {
    mockCell.value = '31/12/2024';

    const result = await analyzeExcelContent('/test/path/file.xlsx');

    expect(result.alertStatus).toBeDefined();
    expect(result.expiryDate).toBeInstanceOf(Date);
    expect(result.expiryDate?.getFullYear()).toBe(2024);
    expect(result.expiryDate?.getMonth()).toBe(11); // December is 11 (0-based)
    expect(result.expiryDate?.getDate()).toBe(31);
  });

  it('should parse date from string format YYYY-MM-DD', async () => {
    mockCell.value = '2024-12-31';

    const result = await analyzeExcelContent('/test/path/file.xlsx');

    expect(result.alertStatus).toBeDefined();
    expect(result.expiryDate).toBeInstanceOf(Date);
    expect(result.expiryDate?.getFullYear()).toBe(2024);
    expect(result.expiryDate?.getMonth()).toBe(11);
    expect(result.expiryDate?.getDate()).toBe(31);
  });

  it('should parse Excel serial number', async () => {
    // Excel serial number for 2024-12-31
    mockCell.value = 45658;

    const result = await analyzeExcelContent('/test/path/file.xlsx');

    expect(result.alertStatus).toBeDefined();
    expect(result.expiryDate).toBeInstanceOf(Date);
  });

  it('should parse Date object directly', async () => {
    const testDate = new Date('2024-12-31');
    mockCell.value = testDate;

    const result = await analyzeExcelContent('/test/path/file.xlsx');

    expect(result.alertStatus).toBeDefined();
    expect(result.expiryDate).toBeInstanceOf(Date);
    expect(result.expiryDate?.getTime()).toBe(testDate.getTime());
  });

  it('should return expired status for past date', async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1); // Yesterday
    mockCell.value = pastDate;

    const result = await analyzeExcelContent('/test/path/file.xlsx');

    expect(result.alertStatus).toBe('expired');
    expect(result.expiryDate).toBeInstanceOf(Date);
  });

  it('should return warning status for date within 30 days', async () => {
    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + 15); // 15 days from now
    mockCell.value = warningDate;

    const result = await analyzeExcelContent('/test/path/file.xlsx');

    expect(result.alertStatus).toBe('warning');
    expect(result.expiryDate).toBeInstanceOf(Date);
  });

  it('should return none status for future date beyond warning period', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 45); // 45 days from now
    mockCell.value = futureDate;

    const result = await analyzeExcelContent('/test/path/file.xlsx');

    expect(result.alertStatus).toBe('none');
    expect(result.expiryDate).toBeInstanceOf(Date);
  });

  it('should handle invalid date strings', async () => {
    mockCell.value = 'invalid-date';

    const result = await analyzeExcelContent('/test/path/file.xlsx');

    expect(result).toEqual({
      alertStatus: 'none',
      expiryDate: null
    });
  });

  it('should handle missing worksheet', async () => {
    mockWorkbook.getWorksheet.mockReturnValue(null);

    const result = await analyzeExcelContent('/test/path/file.xlsx');

    expect(result).toEqual({
      alertStatus: 'none',
      expiryDate: null
    });
  });

  it('should handle ExcelJS readFile errors', async () => {
    mockWorkbook.xlsx.readFile.mockRejectedValue(new Error('File read error'));

    const result = await analyzeExcelContent('/test/path/file.xlsx');

    expect(result).toEqual({
      alertStatus: 'none',
      expiryDate: null
    });
  });

  it('should parse various date formats correctly', async () => {
    const testCases = [
      { input: '31/12/2024', expectedYear: 2024, expectedMonth: 11, expectedDay: 31 },
      { input: '12/31/2024', expectedYear: 2024, expectedMonth: 11, expectedDay: 31 },
      { input: '2024-12-31', expectedYear: 2024, expectedMonth: 11, expectedDay: 31 },
      { input: '31-12-2024', expectedYear: 2024, expectedMonth: 11, expectedDay: 31 },
      { input: '31.12.2024', expectedYear: 2024, expectedMonth: 11, expectedDay: 31 },
      { input: '2024/12/31', expectedYear: 2024, expectedMonth: 11, expectedDay: 31 }
    ];

    for (const testCase of testCases) {
      mockCell.value = testCase.input;

      const result = await analyzeExcelContent('/test/path/file.xlsx');

      expect(result.expiryDate).toBeInstanceOf(Date);
      expect(result.expiryDate?.getFullYear()).toBe(testCase.expectedYear);
      expect(result.expiryDate?.getMonth()).toBe(testCase.expectedMonth);
      expect(result.expiryDate?.getDate()).toBe(testCase.expectedDay);
    }
  });

  it('should handle Google Sheets export correctly', async () => {
    // Simula un Google Sheets esportato in formato Excel
    mockCell.value = '15/01/2025';

    const result = await analyzeExcelContent('/test/path/google-sheet.xlsx');

    expect(result.alertStatus).toBeDefined();
    expect(result.expiryDate).toBeInstanceOf(Date);
    expect(result.expiryDate?.getFullYear()).toBe(2025);
    expect(result.expiryDate?.getMonth()).toBe(0); // January is 0 (0-based)
    expect(result.expiryDate?.getDate()).toBe(15);
  });

  it('should handle various file extensions', async () => {
    const testCases = [
      { extension: '.xlsx', expectedType: 'Excel' },
      { extension: '.xls', expectedType: 'Excel' },
      { extension: '.gsheet', expectedType: 'Google Sheets' }
    ];

    for (const testCase of testCases) {
      mockCell.value = '2025-06-15';
      const filePath = `/test/path/file${testCase.extension}`;
      
      const result = await analyzeExcelContent(filePath);
      
      expect(result.expiryDate).toBeInstanceOf(Date);
      expect(result.expiryDate?.getFullYear()).toBe(2025);
      expect(result.expiryDate?.getMonth()).toBe(5); // June is 5 (0-based)
      expect(result.expiryDate?.getDate()).toBe(15);
    }
  });

  it('should handle conditional formulas like SE(OGGI()<O1;"";O1)', async () => {
    // Test 1: Quando la condizione è vera (oggi < O1), A1 è vuoto
    mockCell.value = ''; // Simula cella vuota quando condizione è vera
    
    const resultEmpty = await analyzeExcelContent('/test/path/conditional-formula.xlsx');
    
    expect(resultEmpty).toEqual({
      alertStatus: 'none',
      expiryDate: null
    });

    // Test 2: Quando la condizione è falsa (oggi >= O1), A1 contiene la data
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 45); // 45 giorni nel futuro
    mockCell.value = futureDate;
    
    const resultWithDate = await analyzeExcelContent('/test/path/conditional-formula.xlsx');
    
    expect(resultWithDate.alertStatus).toBe('none'); // Non scaduto
    expect(resultWithDate.expiryDate).toBeInstanceOf(Date);
    expect(resultWithDate.expiryDate?.getTime()).toBe(futureDate.getTime());

    // Test 3: Quando la data è nel passato
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1); // Ieri
    mockCell.value = pastDate;
    
    const resultPastDate = await analyzeExcelContent('/test/path/conditional-formula.xlsx');
    
    expect(resultPastDate.alertStatus).toBe('expired');
    expect(resultPastDate.expiryDate).toBeInstanceOf(Date);
  });

  it('should handle various conditional formula patterns', async () => {
    const testCases = [
      { 
        description: 'Empty cell when condition true',
        value: '',
        expectedStatus: 'none',
        expectedDate: null
      },
      { 
        description: 'Date when condition false',
        value: '2025-12-31',
        expectedStatus: 'none', // Non scaduto
        expectedDate: new Date('2025-12-31')
      },
      { 
        description: 'Past date when condition false',
        value: '2020-01-01',
        expectedStatus: 'expired',
        expectedDate: new Date('2020-01-01')
      },
      { 
        description: 'Warning date when condition false',
        value: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 giorni
        expectedStatus: 'warning',
        expectedDate: expect.any(Date)
      }
    ];

    for (const testCase of testCases) {
      mockCell.value = testCase.value;
      
      const result = await analyzeExcelContent('/test/path/conditional-formula.xlsx');
      
      expect(result.alertStatus).toBe(testCase.expectedStatus);
      if (testCase.expectedDate === null) {
        expect(result.expiryDate).toBeNull();
      } else {
        expect(result.expiryDate).toBeInstanceOf(Date);
        if (testCase.expectedDate instanceof Date) {
          expect(result.expiryDate?.getTime()).toBe(testCase.expectedDate.getTime());
        }
      }
    }
  });
}); 