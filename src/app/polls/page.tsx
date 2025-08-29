import { PollList } from '@/components/PollList';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function PollsPage() {
  // TODO: Fetch user's polls from Supabase
  const polls = []; // Placeholder empty list

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Polls</h1>
        <Link href="/polls/new">
          <Button>Create New Poll</Button>
        </Link>
      </div>
      <PollList polls={polls} />
    </div>
  );
}
