'use client';

import { PollForm } from '@/components/PollForm';
import { ProtectedRoute } from '@/components/ProtectedRoute';

export default function NewPollPage() {
  return (
    <ProtectedRoute>
      <div className="container mx-auto p-4 max-w-2xl">
        <h1 className="text-3xl font-bold mb-6">Create New Poll</h1>
        <p className="text-gray-600 mb-6">
          Create a new poll and share it with your audience to gather feedback and opinions.
        </p>
        <PollForm />
      </div>
    </ProtectedRoute>
  );
}
