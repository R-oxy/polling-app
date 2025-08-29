'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          router.push('/auth/login?error=callback_error');
          return;
        }

        if (data.session) {
          console.log('Auth callback successful, redirecting to polls');
          router.push('/polls');
        } else {
          console.log('No session found, redirecting to login');
          router.push('/auth/login');
        }
      } catch (error) {
        console.error('Unexpected auth callback error:', error);
        router.push('/auth/login?error=unexpected_error');
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="container mx-auto p-4 max-w-md">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Completing sign up...</h1>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 mt-4">Please wait while we complete your authentication.</p>
      </div>
    </div>
  );
}
