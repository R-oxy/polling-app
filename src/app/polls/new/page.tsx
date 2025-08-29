import { PollForm } from '@/components/PollForm';

export default function NewPollPage() {
  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Create New Poll</h1>
      <PollForm />
    </div>
  );
}
