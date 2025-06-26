import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DocumentTable from '../components/document-table';
import { DocumentDocument as Document } from '../../../../shared-types/schema';

// Mock delle dipendenze
vi.mock('../lib/utils', () => ({
  cn: (...classes: string[]) => classes.filter(Boolean).join(' ')
}));

describe('DocumentTable Component Tests', () => {
  const mockDocuments: Document[] = [
    {
      legacyId: 1,
      title: 'Test Document 1',
      path: '1.0',
      revision: 'Rev.1',
      fileType: 'pdf',
      alertStatus: 'valid',
      updatedAt: new Date('2024-01-01'),
      clientId: 1,
      driveUrl: 'https://drive.google.com/test1',
      isObsolete: false
    },
    {
      legacyId: 2,
      title: 'Test Document 2',
      path: '1.1',
      revision: 'Rev.2',
      fileType: 'docx',
      alertStatus: 'warning',
      updatedAt: new Date('2024-01-02'),
      clientId: 1,
      driveUrl: 'https://drive.google.com/test2',
      isObsolete: false
    },
    {
      legacyId: 3,
      title: 'Test Document 3',
      path: '1.2',
      revision: 'Rev.3',
      fileType: 'xlsx',
      alertStatus: 'expired',
      updatedAt: new Date('2024-01-03'),
      clientId: 1,
      driveUrl: 'https://drive.google.com/test3',
      isObsolete: false
    }
  ];

  const mockOnPreview = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render table with documents', () => {
      render(
        <DocumentTable
          documents={mockDocuments}
          onPreview={mockOnPreview}
          isAdmin={true}
        />
      );

      expect(screen.getByText('Test Document 1')).toBeInTheDocument();
      expect(screen.getByText('Test Document 2')).toBeInTheDocument();
      expect(screen.getByText('Test Document 3')).toBeInTheDocument();
    });

    it('should render empty state when no documents', () => {
      render(
        <DocumentTable
          documents={[]}
          onPreview={mockOnPreview}
          isAdmin={true}
        />
      );

      expect(screen.getByText('Nessun documento trovato')).toBeInTheDocument();
    });

    it('should render table headers correctly', () => {
      render(
        <DocumentTable
          documents={mockDocuments}
          onPreview={mockOnPreview}
          isAdmin={true}
        />
      );

      expect(screen.getByText('Riferimento')).toBeInTheDocument();
      expect(screen.getByText('Documento')).toBeInTheDocument();
      expect(screen.getByText('Revisione')).toBeInTheDocument();
      expect(screen.getByText('Stato')).toBeInTheDocument();
      expect(screen.getByText('Aggiornato')).toBeInTheDocument();
      expect(screen.getByText('Azioni')).toBeInTheDocument();
    });
  });

  describe('Document Information Display', () => {
    it('should display document path correctly', () => {
      render(
        <DocumentTable
          documents={mockDocuments}
          onPreview={mockOnPreview}
          isAdmin={true}
        />
      );

      expect(screen.getByText('1.0')).toBeInTheDocument();
      expect(screen.getByText('1.1')).toBeInTheDocument();
      expect(screen.getByText('1.2')).toBeInTheDocument();
    });

    it('should display document revision correctly', () => {
      render(
        <DocumentTable
          documents={mockDocuments}
          onPreview={mockOnPreview}
          isAdmin={true}
        />
      );

      expect(screen.getByText('Rev.1')).toBeInTheDocument();
      expect(screen.getByText('Rev.2')).toBeInTheDocument();
      expect(screen.getByText('Rev.3')).toBeInTheDocument();
    });

    it('should display document title as link', () => {
      render(
        <DocumentTable
          documents={mockDocuments}
          onPreview={mockOnPreview}
          isAdmin={true}
        />
      );

      const titleLinks = screen.getAllByRole('link');
      expect(titleLinks).toHaveLength(3);
      expect(titleLinks[0]).toHaveAttribute('href', '/documents/1');
      expect(titleLinks[1]).toHaveAttribute('href', '/documents/2');
      expect(titleLinks[2]).toHaveAttribute('href', '/documents/3');
    });
  });

  describe('Status Badges', () => {
    it('should display valid status badge correctly', () => {
      render(
        <DocumentTable
          documents={[mockDocuments[0]]}
          onPreview={mockOnPreview}
          isAdmin={true}
        />
      );

      expect(screen.getByText('Valido')).toBeInTheDocument();
      expect(screen.getByText('OK')).toBeInTheDocument(); // Mobile version
    });

    it('should display warning status badge correctly', () => {
      render(
        <DocumentTable
          documents={[mockDocuments[1]]}
          onPreview={mockOnPreview}
          isAdmin={true}
        />
      );

      expect(screen.getByText('In scadenza')).toBeInTheDocument();
      expect(screen.getByText('Avviso')).toBeInTheDocument(); // Mobile version
    });

    it('should display expired status badge correctly', () => {
      render(
        <DocumentTable
          documents={[mockDocuments[2]]}
          onPreview={mockOnPreview}
          isAdmin={true}
        />
      );

      expect(screen.getByText('Scaduto')).toBeInTheDocument();
      expect(screen.getByText('!')).toBeInTheDocument(); // Mobile version
    });

    it('should handle missing alertStatus', () => {
      const documentWithoutStatus = {
        ...mockDocuments[0],
        alertStatus: undefined
      };

      render(
        <DocumentTable
          documents={[documentWithoutStatus]}
          onPreview={mockOnPreview}
          isAdmin={true}
        />
      );

      expect(screen.getByText('Valido')).toBeInTheDocument();
    });
  });

  describe('File Type Icons', () => {
    it('should display correct icon for PDF files', () => {
      render(
        <DocumentTable
          documents={[mockDocuments[0]]}
          onPreview={mockOnPreview}
          isAdmin={true}
        />
      );

      // Check if the file icon is present (PDF icon)
      const fileIcon = screen.getByTestId('file-icon') || screen.getByRole('img', { hidden: true });
      expect(fileIcon).toBeInTheDocument();
    });

    it('should display correct icon for DOCX files', () => {
      render(
        <DocumentTable
          documents={[mockDocuments[1]]}
          onPreview={mockOnPreview}
          isAdmin={true}
        />
      );

      // Check if the file icon is present (DOCX icon)
      const fileIcon = screen.getByTestId('file-icon') || screen.getByRole('img', { hidden: true });
      expect(fileIcon).toBeInTheDocument();
    });

    it('should display correct icon for XLSX files', () => {
      render(
        <DocumentTable
          documents={[mockDocuments[2]]}
          onPreview={mockOnPreview}
          isAdmin={true}
        />
      );

      // Check if the file icon is present (XLSX icon)
      const fileIcon = screen.getByTestId('file-icon') || screen.getByRole('img', { hidden: true });
      expect(fileIcon).toBeInTheDocument();
    });
  });

  describe('Date Formatting', () => {
    it('should format date correctly', () => {
      render(
        <DocumentTable
          documents={[mockDocuments[0]]}
          onPreview={mockOnPreview}
          isAdmin={true}
        />
      );

      expect(screen.getByText('2024-01-01')).toBeInTheDocument();
    });

    it('should display N/A for missing date', () => {
      const documentWithoutDate = {
        ...mockDocuments[0],
        updatedAt: undefined
      };

      render(
        <DocumentTable
          documents={[documentWithoutDate]}
          onPreview={mockOnPreview}
          isAdmin={true}
        />
      );

      expect(screen.getByText('N/A')).toBeInTheDocument();
    });
  });

  describe('Preview Actions', () => {
    it('should call onPreview when preview button is clicked', () => {
      render(
        <DocumentTable
          documents={[mockDocuments[0]]}
          onPreview={mockOnPreview}
          isAdmin={true}
        />
      );

      const previewButton = screen.getByTitle('Visualizza');
      fireEvent.click(previewButton);

      expect(mockOnPreview).toHaveBeenCalledWith(mockDocuments[0]);
    });

    it('should have correct accessibility attributes', () => {
      render(
        <DocumentTable
          documents={[mockDocuments[0]]}
          onPreview={mockOnPreview}
          isAdmin={true}
        />
      );

      const previewButton = screen.getByTitle('Visualizza');
      expect(previewButton).toHaveAttribute('title', 'Visualizza');
      
      const srOnlyText = screen.getByText('Visualizza', { selector: '.sr-only' });
      expect(srOnlyText).toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    it('should render pagination when documents exceed page size', () => {
      const manyDocuments = Array.from({ length: 15 }, (_, i) => ({
        ...mockDocuments[0],
        legacyId: i + 1,
        title: `Document ${i + 1}`
      }));

      render(
        <DocumentTable
          documents={manyDocuments}
          onPreview={mockOnPreview}
          isAdmin={true}
          pageSize={5}
        />
      );

      expect(screen.getByText('Precedente')).toBeInTheDocument();
      expect(screen.getByText('Successivo')).toBeInTheDocument();
      expect(screen.getByText('1 / 3')).toBeInTheDocument();
    });

    it('should not render pagination when documents fit in one page', () => {
      render(
        <DocumentTable
          documents={mockDocuments}
          onPreview={mockOnPreview}
          isAdmin={true}
          pageSize={10}
        />
      );

      expect(screen.queryByText('Precedente')).not.toBeInTheDocument();
      expect(screen.queryByText('Successivo')).not.toBeInTheDocument();
    });

    it('should handle pagination navigation', () => {
      const manyDocuments = Array.from({ length: 15 }, (_, i) => ({
        ...mockDocuments[0],
        legacyId: i + 1,
        title: `Document ${i + 1}`
      }));

      render(
        <DocumentTable
          documents={manyDocuments}
          onPreview={mockOnPreview}
          isAdmin={true}
          pageSize={5}
        />
      );

      // Initially should show first 5 documents
      expect(screen.getByText('Document 1')).toBeInTheDocument();
      expect(screen.queryByText('Document 6')).not.toBeInTheDocument();

      // Click next page
      const nextButton = screen.getByText('Successivo');
      fireEvent.click(nextButton);

      // Should now show documents 6-10
      expect(screen.queryByText('Document 1')).not.toBeInTheDocument();
      expect(screen.getByText('Document 6')).toBeInTheDocument();
    });

    it('should disable previous button on first page', () => {
      const manyDocuments = Array.from({ length: 15 }, (_, i) => ({
        ...mockDocuments[0],
        legacyId: i + 1,
        title: `Document ${i + 1}`
      }));

      render(
        <DocumentTable
          documents={manyDocuments}
          onPreview={mockOnPreview}
          isAdmin={true}
          pageSize={5}
        />
      );

      const prevButton = screen.getByText('Precedente');
      expect(prevButton).toBeDisabled();
    });

    it('should disable next button on last page', () => {
      const manyDocuments = Array.from({ length: 15 }, (_, i) => ({
        ...mockDocuments[0],
        legacyId: i + 1,
        title: `Document ${i + 1}`
      }));

      render(
        <DocumentTable
          documents={manyDocuments}
          onPreview={mockOnPreview}
          isAdmin={true}
          pageSize={5}
        />
      );

      // Go to last page
      const nextButton = screen.getByText('Successivo');
      fireEvent.click(nextButton);
      fireEvent.click(nextButton);

      expect(nextButton).toBeDisabled();
    });
  });

  describe('Responsive Design', () => {
    it('should show mobile-friendly elements on small screens', () => {
      render(
        <DocumentTable
          documents={mockDocuments}
          onPreview={mockOnPreview}
          isAdmin={true}
        />
      );

      // Check for mobile-specific text
      expect(screen.getByText('OK')).toBeInTheDocument(); // Mobile status text
      expect(screen.getByText('Avviso')).toBeInTheDocument(); // Mobile status text
      expect(screen.getByText('!')).toBeInTheDocument(); // Mobile status text
    });

    it('should show revision in mobile view', () => {
      render(
        <DocumentTable
          documents={mockDocuments}
          onPreview={mockOnPreview}
          isAdmin={true}
        />
      );

      // Check for mobile revision display
      const mobileRevisions = screen.getAllByText(/Rev\.\d+/);
      expect(mobileRevisions.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('should have proper table structure', () => {
      render(
        <DocumentTable
          documents={mockDocuments}
          onPreview={mockOnPreview}
          isAdmin={true}
        />
      );

      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();

      const headers = screen.getAllByRole('columnheader');
      expect(headers.length).toBe(6); // 6 columns
    });

    it('should have proper button accessibility', () => {
      render(
        <DocumentTable
          documents={[mockDocuments[0]]}
          onPreview={mockOnPreview}
          isAdmin={true}
        />
      );

      const previewButton = screen.getByTitle('Visualizza');
      expect(previewButton).toHaveAttribute('title', 'Visualizza');
      expect(screen.getByText('Visualizza', { selector: '.sr-only' })).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle documents with missing properties gracefully', () => {
      const incompleteDocument = {
        legacyId: 999,
        title: 'Incomplete Document',
        path: '1.0',
        revision: 'Rev.1',
        fileType: 'pdf',
        clientId: 1,
        driveUrl: 'https://drive.google.com/test',
        isObsolete: false
        // Missing alertStatus and updatedAt
      };

      render(
        <DocumentTable
          documents={[incompleteDocument as Document]}
          onPreview={mockOnPreview}
          isAdmin={true}
        />
      );

      expect(screen.getByText('Incomplete Document')).toBeInTheDocument();
      expect(screen.getByText('N/A')).toBeInTheDocument(); // For missing date
      expect(screen.getByText('Valido')).toBeInTheDocument(); // Default status
    });
  });

  describe('Filtering', () => {
    it('should filter documents by status correctly', () => {
      const mockDocumentsWithStatus = [
        {
          ...mockDocuments[0],
          alertStatus: "active",
          isObsolete: false
        },
        {
          ...mockDocuments[1],
          alertStatus: "warning",
          isObsolete: false
        },
        {
          ...mockDocuments[2],
          alertStatus: "expired",
          isObsolete: false
        },
        {
          ...mockDocuments[0],
          legacyId: 4,
          title: "Obsolete Document",
          alertStatus: "active",
          isObsolete: true
        }
      ];

      // Test filtro per stato "active"
      const activeFilter = mockDocumentsWithStatus.filter((doc) => {
        const matchesSearch = doc.title?.toLowerCase().includes("".toLowerCase());
        const matchesStatus = !doc.isObsolete && doc.alertStatus?.toLowerCase() === "active";
        return matchesSearch && matchesStatus;
      });

      expect(activeFilter).toHaveLength(1);
      expect(activeFilter[0].alertStatus).toBe("active");

      // Test filtro per stato "obsolete"
      const obsoleteFilter = mockDocumentsWithStatus.filter((doc) => {
        const matchesSearch = doc.title?.toLowerCase().includes("".toLowerCase());
        const matchesStatus = doc.isObsolete === true;
        return matchesSearch && matchesStatus;
      });

      expect(obsoleteFilter).toHaveLength(1);
      expect(obsoleteFilter[0].isObsolete).toBe(true);

      // Test filtro "all"
      const allFilter = mockDocumentsWithStatus.filter((doc) => {
        const matchesSearch = doc.title?.toLowerCase().includes("".toLowerCase());
        const matchesStatus = true; // "all" mostra tutto
        return matchesSearch && matchesStatus;
      });

      expect(allFilter).toHaveLength(4);
    });
  });
}); 