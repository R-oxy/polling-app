import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Poll } from '@/types';

interface PollListProps {
  polls: Poll[];
}

export function PollList({ polls }: PollListProps) {
  if (polls.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <p className="text-lg mb-4">No polls found</p>
            <p className="mb-4">Create your first poll to get started!</p>
            <Link href="/polls/new">
              <Button>Create Your First Poll</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {polls.map((poll) => (
        <Card key={poll.id}>
          <CardHeader>
            <CardTitle className="text-lg">{poll.question}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              {poll.options.map((option, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-sm"
                >
                  {option}
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Link href={`/polls/${poll.id}`}>
                <Button variant="outline" size="sm">
                  View Results
                </Button>
              </Link>
              {/* TODO: Add edit and delete buttons */}
              <Button variant="outline" size="sm" disabled>
                Edit
              </Button>
              <Button variant="outline" size="sm" disabled>
                Delete
              </Button>
            </div>
            {poll.created_at && (
              <p className="text-xs text-gray-500 mt-2">
                Created: {new Date(poll.created_at).toLocaleDateString()}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
