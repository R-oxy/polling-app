import { render } from '@testing-library/react';
import { screen, fireEvent, waitFor } from '@testing-library/dom';
import '@testing-library/jest-dom';
import { Navigation } from '../Navigation';
import { useAuth } from '@/contexts/AuthContext';

// Mock the useAuth hook
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock Next.js Link component
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

describe('Navigation Component', () => {
  const mockSignOut = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render unauthenticated navigation correctly', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      loading: false,
      signOut: mockSignOut,
    });

    render(<Navigation />);

    // Check brand
    expect(screen.getByText('ALX Polly')).toBeInTheDocument();

    // Check unauthenticated links
    expect(screen.getByText('Browse Polls')).toBeInTheDocument();
    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByText('Sign Up')).toBeInTheDocument();

    // Should not show authenticated elements
    expect(screen.queryByText('My Polls')).not.toBeInTheDocument();
    expect(screen.queryByText('Create Poll')).not.toBeInTheDocument();
    expect(screen.queryByText('Sign Out')).not.toBeInTheDocument();
  });

  it('should render authenticated navigation correctly', () => {
    const mockUser = {
      id: 'user-123',
      email: 'john.doe@example.com',
    };

    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false,
      signOut: mockSignOut,
    });

    render(<Navigation />);

    // Check brand
    expect(screen.getByText('ALX Polly')).toBeInTheDocument();

    // Check authenticated links
    expect(screen.getByText('My Polls')).toBeInTheDocument();
    expect(screen.getByText('Create Poll')).toBeInTheDocument();
    expect(screen.getByText('Sign Out')).toBeInTheDocument();

    // Check user welcome message
    expect(screen.getByText('Welcome, John')).toBeInTheDocument();

    // Should not show unauthenticated elements
    expect(screen.queryByText('Browse Polls')).not.toBeInTheDocument();
    expect(screen.queryByText('Login')).not.toBeInTheDocument();
    expect(screen.queryByText('Sign Up')).not.toBeInTheDocument();
  });

  it('should extract first name correctly from various email formats', () => {
    const testCases = [
      { email: 'john.doe@example.com', expectedName: 'John' },
      { email: 'sarah_smith123@test.com', expectedName: 'Sarah' },
      { email: 'mike-wilson@company.org', expectedName: 'Mike' },
      { email: 'alice@domain.com', expectedName: 'Alice' },
      { email: 'bob123@email.com', expectedName: 'Bob' },
      { email: 'jane.doe.smith@example.com', expectedName: 'Jane' },
    ];

    testCases.forEach(({ email, expectedName }) => {
      (useAuth as jest.Mock).mockReturnValue({
        user: { id: 'user-123', email },
        loading: false,
        signOut: mockSignOut,
      });

      const { unmount } = render(<Navigation />);
      expect(screen.getByText(`Welcome, ${expectedName}`)).toBeInTheDocument();
      
      // Clean up for next test
      unmount();
    });
  });

  it('should show user initial in avatar', () => {
    const mockUser = {
      id: 'user-123',
      email: 'sarah.connor@example.com',
    };

    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false,
      signOut: mockSignOut,
    });

    render(<Navigation />);

    // Check that the initial 'S' is displayed
    expect(screen.getByText('S')).toBeInTheDocument();
  });

  it('should handle sign out correctly', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    };

    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false,
      signOut: mockSignOut,
    });

    render(<Navigation />);

    const signOutButton = screen.getByText('Sign Out');
    fireEvent.click(signOutButton);

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });
  });

  it('should show loading state during sign out', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    };

    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: true, // Loading state
      signOut: mockSignOut,
    });

    render(<Navigation />);

    // Check loading text and disabled state
    expect(screen.getByText('Signing out...')).toBeInTheDocument();
    
    const signOutButton = screen.getByRole('button', { name: /signing out/i });
    expect(signOutButton).toBeDisabled();
  });

  it('should handle sign out error gracefully', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    };

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const signOutError = new Error('Sign out failed');
    mockSignOut.mockRejectedValue(signOutError);

    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false,
      signOut: mockSignOut,
    });

    render(<Navigation />);

    const signOutButton = screen.getByText('Sign Out');
    fireEvent.click(signOutButton);

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Sign out error:', signOutError);
    });

    consoleErrorSpy.mockRestore();
  });

  it('should have proper responsive classes', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      loading: false,
      signOut: mockSignOut,
    });

    const { container } = render(<Navigation />);

    // Check for responsive classes
    const centerNav = container.querySelector('.hidden.md\\:flex');
    expect(centerNav).toBeInTheDocument();

    // Check for mobile navigation (only shows for authenticated users)
    expect(container.querySelector('.md\\:hidden')).not.toBeInTheDocument();
  });

  it('should show mobile navigation for authenticated users', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    };

    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false,
      signOut: mockSignOut,
    });

    const { container } = render(<Navigation />);

    // Check for mobile navigation
    const mobileNav = container.querySelector('.md\\:hidden');
    expect(mobileNav).toBeInTheDocument();
  });
});
