import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PollResult } from '@/types';

interface PollListProps {
  polls: PollResult[];
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
        <Card key={poll.id} className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <CardTitle className="text-lg">{poll.title}</CardTitle>
                <CardDescription className="mt-1">{poll.question}</CardDescription>
                {poll.description && (
                  <p className="text-sm text-gray-600 mt-2">{poll.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                {!poll.is_active && (
                  <span className="px-2 py-1 bg-red-100 text-red-700 rounded">
                    Inactive
                  </span>
                )}
                {poll.expires_at && new Date(poll.expires_at) < new Date() && (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded">
                    Expired
                  </span>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Poll Statistics */}
            <div className="grid grid-cols-3 gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="font-semibold text-lg">{poll.total_votes}</div>
                <div className="text-xs text-gray-600">Total Votes</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-lg">{poll.unique_voters}</div>
                <div className="text-xs text-gray-600">Unique Voters</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-lg">{poll.options.length}</div>
                <div className="text-xs text-gray-600">Options</div>
              </div>
            </div>

            {/* Poll Options Preview */}
            <div className="mb-4">
              <p className="text-sm font-medium mb-2">Options:</p>
              <div className="flex flex-wrap gap-2">
                {poll.options.slice(0, 3).map((option, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-sm"
                  >
                    {option}
                  </span>
                ))}
                {poll.options.length > 3 && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-sm">
                    +{poll.options.length - 3} more
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 flex-wrap">
              <Link href={`/polls/${poll.id}`}>
                <Button variant="default" size="sm">
                  View Poll
                </Button>
              </Link>
              <Link href={`/polls/${poll.id}/edit`}>
                <Button variant="outline" size="sm">
                  Edit
                </Button>
              </Link>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  const url = `${window.location.origin}/polls/${poll.id}`;
                  navigator.clipboard.writeText(url);
                  // TODO: Show toast notification
                  console.log('Poll URL copied to clipboard:', url);
                }}
              >
                Share
              </Button>
            </div>

            {/* Poll Metadata */}
            <div className="flex justify-between items-center mt-4 pt-4 border-t text-xs text-gray-500">
              <div>
                Created: {new Date(poll.created_at).toLocaleDateString()}
              </div>
              {poll.last_vote_at && (
                <div>
                  Last vote: {new Date(poll.last_vote_at).toLocaleDateString()}
                </div>
              )}
              {poll.expires_at && (
                <div>
                  Expires: {new Date(poll.expires_at).toLocaleDateString()}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
