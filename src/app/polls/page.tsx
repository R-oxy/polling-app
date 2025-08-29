'use client';

import { PollList } from '@/components/PollList';
import { Button } from '@/components/ui/button';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function PollsPage() {
  const { user } = useAuth();
  
  // TODO: Fetch user's polls from Supabase
  const polls = []; // Placeholder empty list

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
        <PollList polls={polls} />
      </div>
    </ProtectedRoute>
  );
}
