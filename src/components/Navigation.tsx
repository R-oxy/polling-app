'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

/**
 * Navigation Component - Main App Navigation Bar
 *
 * Responsive navigation bar that adapts based on user authentication status.
 * Features a three-column layout with branding, navigation links, and user actions.
 *
 * Layout Structure:
 * - Left: ALX Polly branding/logo
 * - Center: Navigation links (My Polls, Create Poll) - hidden on mobile
 * - Right: User authentication UI (avatar, name, sign out)
 *
 * Features:
 * - Responsive design with mobile menu
 * - User avatar with first name initial
 * - Personalized welcome message
 * - Conditional rendering based on auth state
 * - Loading states for authentication actions
 *
 * @component Navigation
 * @returns {JSX.Element} Navigation bar with branding and user controls
 *
 * @example
 * ```tsx
 * import { Navigation } from '@/components/Navigation';
 *
 * function Layout({ children }) {
 *   return (
 *     <div>
 *       <Navigation />
 *       <main>{children}</main>
 *     </div>
 *   );
 * }
 * ```
 */
export function Navigation() {
  const { user, signOut, loading } = useAuth();

  /**
   * Handle user sign out with error handling
   * Calls the auth context signOut method and logs any errors
   */
  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // Extract first name from email
  const getFirstName = (email: string | undefined): string => {
    // Early return for invalid input
    if (!email) return 'User';
    
    // Extract local part before @ symbol
    const localPart = email.split('@')[0];
    
    // Remove numbers and special characters, keep only letters
    const cleanName = localPart.replace(/[0-9._-]/g, '');
    
    // Return fallback if no letters remain
    if (cleanName.length === 0) return 'User';
    
    // Capitalize first letter, lowercase the rest
    return cleanName[0].toUpperCase() + cleanName.slice(1).toLowerCase();
  };

  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left: Brand Logo */}
          <Link href="/" className="text-xl font-bold text-blue-600 hover:text-blue-700 transition-colors">
            ALX Polly
          </Link>
          
          {/* Center: Main Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {user ? (
              <>
                <Link 
                  href="/polls" 
                  className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
                >
                  My Polls
                </Link>
                <Link 
                  href="/polls/new" 
                  className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
                >
                  Create Poll
                </Link>
              </>
            ) : (
              <>
                <Link 
                  href="/polls" 
                  className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
                >
                  Browse Polls
                </Link>
              </>
            )}
          </div>

          {/* Right: User Actions */}
          <div className="flex items-center space-x-4">
            {user ? (
              // Authenticated user
              <div className="flex items-center space-x-4">
                <div className="hidden sm:flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-blue-600">
                      {getFirstName(user.email).charAt(0)}
                    </span>
                  </div>
                  <span className="text-sm text-gray-700 font-medium">
                    Welcome, {getFirstName(user.email)}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                  disabled={loading}
                  className="border-gray-300 hover:border-red-400 hover:text-red-600"
                >
                  {loading ? 'Signing out...' : 'Sign Out'}
                </Button>
              </div>
            ) : (
              // Unauthenticated user
              <div className="flex items-center space-x-3">
                <Link 
                  href="/auth/login" 
                  className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
                >
                  Login
                </Link>
                <Link href="/auth/register">
                  <Button variant="default" size="sm" className="bg-blue-600 hover:bg-blue-700">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation Menu (for smaller screens) */}
        {user && (
          <div className="md:hidden mt-3 pt-3 border-t border-gray-200">
            <div className="flex justify-center space-x-6">
              <Link 
                href="/polls" 
                className="text-gray-700 hover:text-blue-600 font-medium transition-colors text-sm"
              >
                My Polls
              </Link>
              <Link 
                href="/polls/new" 
                className="text-gray-700 hover:text-blue-600 font-medium transition-colors text-sm"
              >
                Create Poll
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
