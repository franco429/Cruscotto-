import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '../hooks/use-auth';
import { useToast } from '../hooks/use-toast';

// Mock delle dipendenze
vi.mock('../hooks/use-toast', () => ({
  useToast: vi.fn(() => ({
    toast: vi.fn()
  }))
}));

vi.mock('../lib/queryClient', () => ({
  getQueryFn: vi.fn(),
  apiRequest: vi.fn(),
  queryClient: {
    invalidateQueries: vi.fn(),
    setQueryData: vi.fn(),
    clear: vi.fn()
  },
  resetCSRFToken: vi.fn()
}));

// Componente di test per accedere al context
function TestComponent() {
  const auth = useAuth();
  
  return (
    <div>
      <div data-testid="user-email">{auth.user?.email || 'no-user'}</div>
      <div data-testid="is-loading">{auth.isLoading ? 'loading' : 'not-loading'}</div>
      <div data-testid="error">{auth.error?.message || 'no-error'}</div>
      <button 
        data-testid="login-btn" 
        onClick={() => auth.loginMutation.mutate({
          email: 'test@example.com',
          password: 'password123',
          remember: false
        })}
      >
        Login
      </button>
      <button 
        data-testid="logout-btn" 
        onClick={() => auth.logoutMutation.mutate()}
      >
        Logout
      </button>
      <button 
        data-testid="register-btn" 
        onClick={() => auth.registerMutation.mutate({
          email: 'new@example.com',
          password: 'NewPassword123!',
          confirmPassword: 'NewPassword123!',
          clientName: 'Test Company',
          driveFolderUrl: 'https://drive.google.com/drive/folders/test',
          companyCode: 'TEST123',
          acceptTerms: true
        })}
      >
        Register
      </button>
    </div>
  );
}

describe('Auth Hook Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
        mutations: {
          retry: false,
        },
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('AuthProvider', () => {
    it('should provide auth context', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        </QueryClientProvider>
      );

      expect(screen.getByTestId('user-email')).toBeInTheDocument();
      expect(screen.getByTestId('is-loading')).toBeInTheDocument();
      expect(screen.getByTestId('error')).toBeInTheDocument();
    });

    it('should show loading state initially', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        </QueryClientProvider>
      );

      expect(screen.getByTestId('is-loading')).toHaveTextContent('loading');
    });

    it('should show no user initially', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        </QueryClientProvider>
      );

      expect(screen.getByTestId('user-email')).toHaveTextContent('no-user');
    });
  });

  describe('Login Mutation', () => {
    it('should handle successful login', async () => {
      const mockApiRequest = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({
          email: 'test@example.com',
          role: 'admin',
          clientId: 1
        })
      });

      vi.mocked(require('../lib/queryClient').apiRequest).mockImplementation(mockApiRequest);

      render(
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        </QueryClientProvider>
      );

      const loginButton = screen.getByTestId('login-btn');
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith('POST', '/api/login', {
          email: 'test@example.com',
          password: 'password123',
          remember: false
        });
      });
    });

    it('should handle login error', async () => {
      const mockApiRequest = vi.fn().mockRejectedValue(new Error('Invalid credentials'));
      const mockToast = vi.fn();

      vi.mocked(require('../lib/queryClient').apiRequest).mockImplementation(mockApiRequest);
      vi.mocked(useToast).mockReturnValue({ toast: mockToast });

      render(
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        </QueryClientProvider>
      );

      const loginButton = screen.getByTestId('login-btn');
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Accesso fallito',
          description: 'Invalid credentials',
          variant: 'destructive',
        });
      });
    });
  });

  describe('Logout Mutation', () => {
    it('should handle successful logout', async () => {
      const mockApiRequest = vi.fn().mockResolvedValue({});
      const mockToast = vi.fn();

      vi.mocked(require('../lib/queryClient').apiRequest).mockImplementation(mockApiRequest);
      vi.mocked(useToast).mockReturnValue({ toast: mockToast });

      render(
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        </QueryClientProvider>
      );

      const logoutButton = screen.getByTestId('logout-btn');
      fireEvent.click(logoutButton);

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith('POST', '/api/logout');
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Disconnessione effettuata',
          description: 'Sei stato disconnesso con successo',
        });
      });
    });

    it('should handle logout error', async () => {
      const mockApiRequest = vi.fn().mockRejectedValue(new Error('Logout failed'));
      const mockToast = vi.fn();

      vi.mocked(require('../lib/queryClient').apiRequest).mockImplementation(mockApiRequest);
      vi.mocked(useToast).mockReturnValue({ toast: mockToast });

      render(
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        </QueryClientProvider>
      );

      const logoutButton = screen.getByTestId('logout-btn');
      fireEvent.click(logoutButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Disconnessione fallita',
          description: 'Logout failed',
          variant: 'destructive',
        });
      });
    });
  });

  describe('Register Mutation', () => {
    it('should handle successful registration', async () => {
      const mockApiRequest = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({
          user: {
            email: 'new@example.com',
            role: 'admin'
          }
        })
      });
      const mockToast = vi.fn();

      vi.mocked(require('../lib/queryClient').apiRequest).mockImplementation(mockApiRequest);
      vi.mocked(useToast).mockReturnValue({ toast: mockToast });

      render(
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        </QueryClientProvider>
      );

      const registerButton = screen.getByTestId('register-btn');
      fireEvent.click(registerButton);

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith('POST', '/api/register/admin', {
          email: 'new@example.com',
          password: 'NewPassword123!',
          clientName: 'Test Company',
          driveFolderUrl: 'https://drive.google.com/drive/folders/test',
          companyCode: 'TEST123',
          acceptTerms: true
        });
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Registrazione completata',
          description: 'Benvenuto, new@example.com!',
        });
      });
    });

    it('should handle registration error', async () => {
      const mockApiRequest = vi.fn().mockRejectedValue(new Error('Registration failed'));
      const mockToast = vi.fn();

      vi.mocked(require('../lib/queryClient').apiRequest).mockImplementation(mockApiRequest);
      vi.mocked(useToast).mockReturnValue({ toast: mockToast });

      render(
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        </QueryClientProvider>
      );

      const registerButton = screen.getByTestId('register-btn');
      fireEvent.click(registerButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Registrazione fallita',
          description: 'Registration failed',
          variant: 'destructive',
        });
      });
    });
  });

  describe('useAuth Hook', () => {
    it('should throw error when used outside AuthProvider', () => {
      // Sopprime l'errore console per questo test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useAuth must be used within an AuthProvider');

      consoleSpy.mockRestore();
    });
  });
}); 