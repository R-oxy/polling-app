import { PollView } from '@/components/PollView';

interface PollPageProps {
  params: Promise<{ id: string }>;
}

export default async function PollPage({ params }: PollPageProps) {
  const { id } = await params;
  
  // TODO: Fetch poll by ID from Supabase
  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Poll Details</h1>
      <PollView pollId={id} />
    </div>
  );
}
