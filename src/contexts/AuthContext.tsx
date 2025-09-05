'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

/**
 * Authentication Context for ALX Polling App
 *
 * This context provides centralized authentication state management across the entire application.
 * It handles user sessions, authentication state changes, and provides methods for sign up,
 * sign in, and sign out operations using Supabase Auth.
 *
 * Key Features:
 * - Automatic session restoration on app load
 * - Real-time authentication state monitoring
 * - Secure token-based authentication
 * - Comprehensive error handling
 *
 * @context AuthContext
 * @provides {AuthContextType} Authentication methods and state
 */

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider Component
 *
 * Provides authentication context to the entire application. This component:
 * 1. Initializes authentication state on mount
 * 2. Monitors authentication state changes in real-time
 * 3. Handles session persistence across browser refreshes
 * 4. Provides authentication methods to child components
 *
 * @component AuthProvider
 * @param {React.ReactNode} children - Child components that need access to auth context
 * @returns {JSX.Element} Context provider wrapping children
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    /**
     * Initialize authentication state on component mount
     * This ensures users remain logged in across browser refreshes
     */
    const getInitialSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Error getting session:', error);
      } else {
        setSession(session);
        setUser(session?.user ?? null);
      }
      setLoading(false);
    };

    getInitialSession();

    /**
     * Set up real-time authentication state listener
     * Monitors all authentication events and updates state accordingly
     */
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);

        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Handle different auth events for logging and potential side effects
        if (event === 'SIGNED_IN') {
          console.log('User signed in:', session?.user?.email);
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out');
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed');
        }
      }
    );

    // Cleanup subscription on unmount to prevent memory leaks
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  /**
   * Sign up a new user with email and password
   *
   * Creates a new user account using Supabase Auth. Upon successful registration,
   * Supabase sends a confirmation email to the user. The user must click the
   * confirmation link before they can sign in.
   *
   * @async
   * @param {string} email - User's email address (must be unique)
   * @param {string} password - User's password (enforced by Supabase policies)
   * @returns {Promise<{error: any}>} Object containing error if signup fails, null otherwise
   *
   * @example
   * ```typescript
   * const { error } = await signUp('user@example.com', 'password123');
   * if (error) {
   *   console.error('Signup failed:', error.message);
   * } else {
   *   console.log('Signup successful, check email for confirmation');
   * }
   * ```
   */
  const signUp = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Redirect to callback page after email confirmation
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        console.error('Sign up error:', error);
        return { error };
      }

      console.log('Sign up successful:', data);
      return { error: null };
    } catch (error) {
      console.error('Unexpected sign up error:', error);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sign in an existing user with email and password
   *
   * Authenticates a user using their email and password. Upon successful authentication,
   * the user session is established and the user object is updated in the context.
   * This method should only be called for users who have already confirmed their email.
   *
   * @async
   * @param {string} email - User's registered email address
   * @param {string} password - User's password
   * @returns {Promise<{error: any}>} Object containing error if signin fails, null otherwise
   *
   * @example
   * ```typescript
   * const { error } = await signIn('user@example.com', 'password123');
   * if (error) {
   *   console.error('Signin failed:', error.message);
   * } else {
   *   console.log('Signin successful');
   * }
   * ```
   */
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Sign in error:', error);
        return { error };
      }

      console.log('Sign in successful:', data);
      return { error: null };
    } catch (error) {
      console.error('Unexpected sign in error:', error);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sign out the current user
   *
   * Terminates the current user session and clears authentication state.
   * This method should be called when users want to log out of the application.
   * After successful sign out, the user object and session will be set to null.
   *
   * @async
   * @returns {Promise<void>} Resolves when sign out is complete (success or failure)
   *
   * @example
   * ```typescript
   * await signOut();
   * // User is now logged out, context will update automatically
   * ```
   */
  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('Sign out error:', error);
      } else {
        console.log('Sign out successful');
      }
    } catch (error) {
      console.error('Unexpected sign out error:', error);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Custom hook to access authentication context
 *
 * Provides access to the current authentication state and methods throughout the application.
 * This hook must be used within components that are descendants of the AuthProvider.
 *
 * @returns {AuthContextType} Authentication context containing user, session, loading state, and auth methods
 * @throws {Error} If used outside of AuthProvider context
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   const { user, loading, signOut } = useAuth();
 *
 *   if (loading) return <div>Loading...</div>;
 *   if (!user) return <div>Please sign in</div>;
 *
 *   return (
 *     <div>
 *       <p>Welcome, {user.email}!</p>
 *       <button onClick={signOut}>Sign Out</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
