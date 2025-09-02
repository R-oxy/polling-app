'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { PollResult } from '@/types';
import Link from 'next/link';

interface PollViewProps {
  pollId: string;
}

export function PollView({ pollId }: PollViewProps) {
  const [poll, setPoll] = useState<PollResult | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hasVoted, setHasVoted] = useState(false);
  const [userVote, setUserVote] = useState<any>(null);
  const [showThankYou, setShowThankYou] = useState(false);
  const [voteJustSubmitted, setVoteJustSubmitted] = useState(false);
  
  const { user } = useAuth();
  const router = useRouter();
  
  const isOwner = user && poll && poll.created_by === user.id;

  useEffect(() => {
    fetchPoll();
    if (user) {
      checkVoteStatus();
    }
  }, [pollId, user]);

  const fetchPoll = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`/api/polls/${pollId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch poll');
      }

      setPoll(data.poll);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load poll');
      console.error('Error fetching poll:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkVoteStatus = async () => {
    if (!user) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(`/api/polls/${pollId}/vote`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setHasVoted(data.hasVoted);
        setUserVote(data.userVote);
      }
    } catch (err) {
      console.error('Error checking vote status:', err);
    }
  };

  const handleVote = async () => {
    if (selectedOption === null || !poll) return;
    
    setVoting(true);
    setError('');
    
    try {
      // Prepare vote data
      const voteData: any = {
        option_index: selectedOption,
      };

      // Add IP and user agent for anonymous voting
      if (!user) {
        // Get user's IP (in production, you might want to use a proper IP detection service)
        voteData.voter_ip = 'anonymous'; // Placeholder - in production, get real IP
        voteData.user_agent = navigator.userAgent;
      }

      // Get auth token if user is logged in
      let headers: any = {
        'Content-Type': 'application/json',
      };

      if (user) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
      }

      // Submit vote
      const response = await fetch(`/api/polls/${pollId}/vote`, {
        method: 'POST',
        headers,
        body: JSON.stringify(voteData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit vote');
      }

      // Update poll data with new results
      if (data.poll) {
        setPoll(data.poll);
      }

      // Show success state
      setVoteJustSubmitted(true);
      setHasVoted(true);
      setUserVote({
        option_index: selectedOption,
        option_text: poll.options[selectedOption],
        created_at: new Date().toISOString(),
      });
      setShowThankYou(true);
      setSuccess(data.message || 'Vote submitted successfully!');
      
      // Hide thank you message after 5 seconds
      setTimeout(() => {
        setShowThankYou(false);
        setVoteJustSubmitted(false);
      }, 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit vote');
    } finally {
      setVoting(false);
    }
  };

  const handleEdit = () => {
    router.push(`/polls/${pollId}/edit`);
  };

  const handleDelete = async () => {
    if (!poll || !user) return;
    
    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${poll.title}"? This action cannot be undone.`
    );
    
    if (!confirmDelete) return;
    
    setDeleting(true);
    setError('');
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No valid session found');
      }

      const response = await fetch(`/api/polls/${pollId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete poll');
      }

      // Show success and redirect
      setSuccess('Poll deleted successfully!');
      setTimeout(() => {
        router.push('/polls');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete poll');
    } finally {
      setDeleting(false);
    }
  };

  const getVoteCount = (optionIndex: number) => {
    if (!poll?.option_counts) return 0;
    return poll.option_counts[optionIndex.toString()] || 0;
  };

  const getVotePercentage = (optionIndex: number) => {
    if (!poll?.total_votes || poll.total_votes === 0) return 0;
    const count = getVoteCount(optionIndex);
    return Math.round((count / poll.total_votes) * 100);
  };

  const isExpired = poll?.expires_at && new Date(poll.expires_at) < new Date();

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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <CardTitle className="text-2xl">{poll.title}</CardTitle>
              {poll.description && (
                <p className="text-gray-600 mt-2">{poll.description}</p>
              )}
              <h2 className="text-lg font-medium mt-4">{poll.question}</h2>
            </div>
            
            {/* Status Indicators */}
            <div className="flex items-center gap-2 text-xs">
              {!poll.is_active && (
                <span className="px-2 py-1 bg-red-100 text-red-700 rounded">
                  Inactive
                </span>
              )}
              {isExpired && (
                <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded">
                  Expired
                </span>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Success/Error Messages */}
          {success && (
            <div className="text-sm text-green-600 bg-green-50 p-3 rounded-md border border-green-200">
              {success}
            </div>
          )}
          
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
              {error}
            </div>
          )}

          {/* Poll Statistics */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="font-semibold text-xl">{poll.total_votes}</div>
              <div className="text-xs text-gray-600">Total Votes</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-xl">{poll.unique_voters}</div>
              <div className="text-xs text-gray-600">Unique Voters</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-xl">{poll.options.length}</div>
              <div className="text-xs text-gray-600">Options</div>
            </div>
          </div>

          {/* Thank You Message */}
          {showThankYou && (
            <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6 text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Thank You for Voting! 🎉</h3>
              <p className="text-gray-600 mb-4">
                Your vote for "<span className="font-semibold text-blue-600">{userVote?.option_text}</span>" has been recorded.
              </p>
              <p className="text-sm text-gray-500">
                {voteJustSubmitted ? "You can see the updated results below." : "Scroll down to see the current results."}
              </p>
            </div>
          )}

          {/* Voting Section */}
          {poll.is_active && !isExpired && !hasVoted && (
            <div className="space-y-4 border-2 border-blue-200 rounded-lg p-6 bg-blue-50/30">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zM9 9V7a1 1 0 112 0v2a1 1 0 11-2 0zm0 4a1 1 0 112 0 1 1 0 01-2 0z" clipRule="evenodd" />
                </svg>
                <h3 className="font-semibold text-lg text-blue-900">Cast Your Vote</h3>
              </div>
              
              <div className="space-y-3">
                {poll.options.map((option, index) => (
                  <label 
                    key={index} 
                    className={`flex items-center space-x-3 cursor-pointer p-3 rounded-lg border-2 transition-all ${
                      selectedOption === index 
                        ? 'border-blue-500 bg-blue-100' 
                        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="poll-option"
                      value={index}
                      checked={selectedOption === index}
                      onChange={(e) => setSelectedOption(parseInt(e.target.value))}
                      className="w-4 h-4 text-blue-600"
                      disabled={voting}
                    />
                    <span className="flex-1 font-medium">{option}</span>
                    {selectedOption === index && (
                      <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </label>
                ))}
              </div>
              
              <Button 
                onClick={handleVote} 
                disabled={selectedOption === null || voting}
                className="w-full py-3 text-lg font-semibold"
                size="lg"
              >
                {voting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting Your Vote...
                  </>
                ) : selectedOption !== null ? (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Submit Vote for "{poll.options[selectedOption]}"
                  </>
                ) : (
                  'Select an Option to Vote'
                )}
              </Button>
              
              {!user && (
                <p className="text-xs text-gray-600 text-center">
                  💡 <Link href="/auth/login" className="text-blue-600 hover:underline">Sign in</Link> to track your votes and prevent duplicate voting
                </p>
              )}
            </div>
          )}

          {/* Already Voted Message */}
          {hasVoted && !showThankYou && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
              <div className="flex justify-center mb-2">
                <svg className="w-8 h-8 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">You've Already Voted</h3>
              {userVote && (
                <p className="text-sm text-gray-600">
                  Your vote: <span className="font-medium">"{userVote.option_text}"</span>
                  {userVote.created_at && (
                    <span className="block text-xs mt-1">
                      Voted on {new Date(userVote.created_at).toLocaleString()}
                    </span>
                  )}
                </p>
              )}
            </div>
          )}

          {/* Poll Closed Message */}
          {(!poll.is_active || isExpired) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
              <div className="flex justify-center mb-2">
                <svg className="w-8 h-8 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="font-semibold text-yellow-900 mb-1">
                {!poll.is_active ? 'Poll is Inactive' : 'Poll Has Expired'}
              </h3>
              <p className="text-sm text-yellow-700">
                {!poll.is_active 
                  ? 'This poll is not currently accepting votes.' 
                  : `This poll expired on ${new Date(poll.expires_at!).toLocaleString()}`
                }
              </p>
            </div>
          )}

          {/* Results Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Results ({poll.total_votes} votes):</h3>
            <div className="space-y-3">
              {poll.options.map((option, index) => {
                const count = getVoteCount(index);
                const percentage = getVotePercentage(index);
                
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{option}</span>
                      <span className="text-gray-600">{count} votes ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Owner Actions */}
          {isOwner && (
            <div className="pt-4 border-t">
              <h3 className="font-semibold mb-3">Poll Management:</h3>
              <div className="flex gap-2">
                <Button 
                  onClick={handleEdit} 
                  variant="outline" 
                  size="sm"
                  disabled={deleting}
                >
                  Edit Poll
                </Button>
                <Button 
                  onClick={handleDelete} 
                  variant="destructive" 
                  size="sm"
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Delete Poll'}
                </Button>
              </div>
            </div>
          )}

          {/* Poll Metadata */}
          <div className="pt-4 border-t text-sm text-gray-500 space-y-1">
            <div>Created: {new Date(poll.created_at).toLocaleString()}</div>
            {poll.last_vote_at && (
              <div>Last vote: {new Date(poll.last_vote_at).toLocaleString()}</div>
            )}
            {poll.expires_at && (
              <div>
                Expires: {new Date(poll.expires_at).toLocaleString()}
                {isExpired && <span className="text-red-600 ml-2">(Expired)</span>}
              </div>
            )}
            <div>Allow multiple votes: {poll.allow_multiple_votes ? 'Yes' : 'No'}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
