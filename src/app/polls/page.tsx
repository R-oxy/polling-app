'use client';

import { useState, useEffect } from 'react';
import { PollList } from '@/components/PollList';
import { Button } from '@/components/ui/button';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { PollResult } from '@/types';
import Link from 'next/link';

export default function PollsPage() {
  const { user } = useAuth();
  const [polls, setPolls] = useState<PollResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      fetchPolls();
    }
  }, [user]);

  const fetchPolls = async () => {
    try {
      setLoading(true);
      setError('');

      // Get the current session to get the access token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No valid session found');
      }

      const response = await fetch('/api/polls', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch polls');
      }

      setPolls(data.polls);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load polls');
      console.error('Error fetching polls:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">My Polls</h1>
            <p className="text-gray-600 mt-1">
              Manage your polls and view results
            </p>
          </div>
          <Link href="/polls/new">
            <Button>Create New Poll</Button>
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your polls...</p>
            </div>
          </div>
        ) : (
          <PollList polls={polls} />
        )}
      </div>
    </ProtectedRoute>
  );
}
