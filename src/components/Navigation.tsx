'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

export function Navigation() {
  const { user, signOut, loading } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <Link href="/" className="text-xl font-bold">
            ALX Polly
          </Link>
          
          <div className="flex items-center space-x-4">
            {user ? (
              // Authenticated user navigation
              <>
                <Link href="/polls" className="hover:underline">
                  My Polls
                </Link>
                <Link href="/polls/new" className="hover:underline">
                  Create Poll
                </Link>
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-600">
                    Welcome, {user.email}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSignOut}
                    disabled={loading}
                  >
                    {loading ? 'Signing out...' : 'Sign Out'}
                  </Button>
                </div>
              </>
            ) : (
              // Unauthenticated user navigation
              <>
                <Link href="/polls" className="hover:underline">
                  Browse Polls
                </Link>
                <Link href="/auth/login" className="hover:underline">
                  Login
                </Link>
                <Link href="/auth/register">
                  <Button variant="default" size="sm">
                    Sign Up
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
