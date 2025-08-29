'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Poll, Vote } from '@/types';

interface PollViewProps {
  pollId: string;
}

export function PollView({ pollId }: PollViewProps) {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // TODO: Fetch poll data and votes from API
    const fetchPoll = async () => {
      try {
        // Placeholder data - replace with actual API call
        setPoll({
          id: pollId,
          question: 'What is your favorite programming language?',
          options: ['JavaScript', 'Python', 'TypeScript', 'Go'],
          created_by: 'user-123',
          created_at: new Date().toISOString(),
        });
        
        // Mock votes data
        setVotes([
          { poll_id: pollId, option: 'JavaScript' },
          { poll_id: pollId, option: 'Python' },
          { poll_id: pollId, option: 'JavaScript' },
          { poll_id: pollId, option: 'TypeScript' },
        ]);
      } catch (err) {
        setError('Failed to load poll');
      } finally {
        setLoading(false);
      }
    };

    fetchPoll();
  }, [pollId]);

  const handleVote = async () => {
    if (!selectedOption) return;
    
    setVoting(true);
    try {
      // TODO: Submit vote to API
      const newVote: Vote = {
        poll_id: pollId,
        option: selectedOption,
      };
      
      // Add vote to local state (replace with API call)
      setVotes(prev => [...prev, newVote]);
      
      console.log('Vote submitted:', newVote);
    } catch (err) {
      setError('Failed to submit vote');
    } finally {
      setVoting(false);
    }
  };

  const getVoteCount = (option: string) => {
    return votes.filter(vote => vote.option === option).length;
  };

  const getTotalVotes = () => {
    return votes.length;
  };

  const getVotePercentage = (option: string) => {
    const total = getTotalVotes();
    if (total === 0) return 0;
    return Math.round((getVoteCount(option) / total) * 100);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading poll...</div>
        </CardContent>
      </Card>
    );
  }

  if (error || !poll) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            {error || 'Poll not found'}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{poll.question}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Voting Section */}
        <div className="space-y-3">
          <h3 className="font-semibold">Cast Your Vote:</h3>
          {poll.options.map((option) => (
            <label key={option} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="poll-option"
                value={option}
                checked={selectedOption === option}
                onChange={(e) => setSelectedOption(e.target.value)}
                className="w-4 h-4"
              />
              <span>{option}</span>
            </label>
          ))}
          <Button 
            onClick={handleVote} 
            disabled={!selectedOption || voting}
            className="w-full"
          >
            {voting ? 'Submitting...' : 'Submit Vote'}
          </Button>
        </div>

        {/* Results Section */}
        <div className="space-y-3">
          <h3 className="font-semibold">Results ({getTotalVotes()} votes):</h3>
          {poll.options.map((option) => {
            const count = getVoteCount(option);
            const percentage = getVotePercentage(option);
            
            return (
              <div key={option} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{option}</span>
                  <span>{count} votes ({percentage}%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Share Section */}
        <div className="pt-4 border-t">
          <h3 className="font-semibold mb-2">Share this poll:</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled>
              Copy Link
            </Button>
            <Button variant="outline" size="sm" disabled>
              Generate QR Code
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
