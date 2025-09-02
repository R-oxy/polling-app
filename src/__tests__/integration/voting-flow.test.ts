/**
 * Integration Test: Complete Voting Flow
 * 
 * This test simulates the complete user journey:
 * 1. Create a poll
 * 2. View the poll
 * 3. Submit a vote
 * 4. Verify vote was recorded
 * 5. Check updated poll results
 */

import { NextRequest } from 'next/server';
import { POST as CreatePoll, GET as GetPolls } from '@/app/api/polls/route';
import { GET as GetPoll } from '@/app/api/polls/[id]/route';
import { POST as SubmitVote, GET as CheckVote } from '@/app/api/polls/[id]/vote/route';
import { createClient } from '@supabase/supabase-js';

// Mock the Supabase clients
jest.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: jest.fn(),
}));

describe('Integration: Complete Voting Flow', () => {
  let mockSupabaseClient: any;
  let mockServerSupabaseClient: any;
  
  // Test data
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  const testPollData = {
    title: 'Favorite Programming Language',
    description: 'Help us understand developer preferences',
    question: 'What is your favorite programming language?',
    options: ['JavaScript', 'Python', 'TypeScript', 'Go'],
    allow_multiple_votes: false,
    expires_at: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock client-side Supabase
    mockSupabaseClient = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
    };
    
    // Mock server-side Supabase
    mockServerSupabaseClient = {
      from: jest.fn(),
    };

    (createClient as jest.Mock).mockReturnValue(mockSupabaseClient);
    require('@/lib/supabase').createServerSupabaseClient.mockReturnValue(mockServerSupabaseClient);
  });

  it('should complete the full voting flow successfully', async () => {
    // Step 1: Create a poll
    const createdPoll = {
      id: 'poll-123',
      ...testPollData,
      created_by: mockUser.id,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      total_votes: 0,
      unique_voters: 0,
      option_counts: {},
      last_vote_at: null,
    };

    // Mock poll creation
    mockServerSupabaseClient.from.mockReturnValueOnce({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: createdPoll,
            error: null,
          }),
        }),
      }),
    });

    const createRequest = new NextRequest('http://localhost:3000/api/polls', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token',
      },
      body: JSON.stringify(testPollData),
    });

    const createResponse = await CreatePoll(createRequest);
    const createData = await createResponse.json();

    expect(createResponse.status).toBe(200);
    expect(createData.poll.id).toBe('poll-123');
    expect(createData.poll.title).toBe(testPollData.title);

    // Step 2: Fetch the created poll
    mockServerSupabaseClient.from.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: createdPoll,
            error: null,
          }),
        }),
      }),
    });

    const getPollRequest = new NextRequest('http://localhost:3000/api/polls/poll-123', {
      method: 'GET',
    });

    const getPollParams = Promise.resolve({ id: 'poll-123' });
    const getPollResponse = await GetPoll(getPollRequest, { params: getPollParams });
    const getPollData = await getPollResponse.json();

    expect(getPollResponse.status).toBe(200);
    expect(getPollData.poll.id).toBe('poll-123');
    expect(getPollData.poll.is_active).toBe(true);

    // Step 3: Check vote status (should be false initially)
    mockServerSupabaseClient.from.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' }, // No existing vote
            }),
          }),
        }),
      }),
    });

    const checkVoteRequest = new NextRequest('http://localhost:3000/api/polls/poll-123/vote', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer test-token',
      },
    });

    const checkVoteParams = Promise.resolve({ id: 'poll-123' });
    const checkVoteResponse = await CheckVote(checkVoteRequest, { params: checkVoteParams });
    const checkVoteData = await checkVoteResponse.json();

    expect(checkVoteResponse.status).toBe(200);
    expect(checkVoteData.hasVoted).toBe(false);

    // Step 4: Submit a vote
    const submittedVote = {
      id: 'vote-123',
      poll_id: 'poll-123',
      option_index: 2, // TypeScript
      option_text: 'TypeScript',
      voter_id: mockUser.id,
      created_at: new Date().toISOString(),
    };

    const updatedPollAfterVote = {
      ...createdPoll,
      total_votes: 1,
      unique_voters: 1,
      option_counts: { '2': 1 },
      last_vote_at: submittedVote.created_at,
    };

    // Mock vote submission chain
    mockServerSupabaseClient.from
      // Fetch poll for validation
      .mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: createdPoll,
              error: null,
            }),
          }),
        }),
      })
      // Check for existing vote
      .mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' },
            }),
          }),
        }),
      })
      // Insert new vote
      .mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: submittedVote,
              error: null,
            }),
          }),
        }),
      })
      // Fetch updated analytics
      .mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                poll_id: 'poll-123',
                total_votes: 1,
                unique_voters: 1,
                option_counts: { '2': 1 },
              },
              error: null,
            }),
          }),
        }),
      })
      // Fetch updated poll
      .mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: updatedPollAfterVote,
              error: null,
            }),
          }),
        }),
      });

    const voteRequest = new NextRequest('http://localhost:3000/api/polls/poll-123/vote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token',
      },
      body: JSON.stringify({
        option_index: 2,
      }),
    });

    const voteParams = Promise.resolve({ id: 'poll-123' });
    const voteResponse = await SubmitVote(voteRequest, { params: voteParams });
    const voteData = await voteResponse.json();

    expect(voteResponse.status).toBe(200);
    expect(voteData.success).toBe(true);
    expect(voteData.vote.option_index).toBe(2);
    expect(voteData.vote.option_text).toBe('TypeScript');
    expect(voteData.poll.total_votes).toBe(1);
    expect(voteData.poll.option_counts['2']).toBe(1);

    // Step 5: Verify vote status changed
    mockServerSupabaseClient.from.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: submittedVote,
              error: null,
            }),
          }),
        }),
      }),
    });

    const finalCheckRequest = new NextRequest('http://localhost:3000/api/polls/poll-123/vote', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer test-token',
      },
    });

    const finalCheckParams = Promise.resolve({ id: 'poll-123' });
    const finalCheckResponse = await CheckVote(finalCheckRequest, { params: finalCheckParams });
    const finalCheckData = await finalCheckResponse.json();

    expect(finalCheckResponse.status).toBe(200);
    expect(finalCheckData.hasVoted).toBe(true);
    expect(finalCheckData.userVote.option_index).toBe(2);
    expect(finalCheckData.userVote.option_text).toBe('TypeScript');

    // Step 6: Verify poll appears in user's poll list
    mockServerSupabaseClient.from.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: [updatedPollAfterVote],
            error: null,
          }),
        }),
      }),
    });

    const getUserPollsRequest = new NextRequest('http://localhost:3000/api/polls', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer test-token',
      },
    });

    const getUserPollsResponse = await GetPolls(getUserPollsRequest);
    const getUserPollsData = await getUserPollsResponse.json();

    expect(getUserPollsResponse.status).toBe(200);
    expect(getUserPollsData.polls).toHaveLength(1);
    expect(getUserPollsData.polls[0].id).toBe('poll-123');
    expect(getUserPollsData.polls[0].total_votes).toBe(1);
  });

  it('should prevent duplicate voting when multiple votes not allowed', async () => {
    const existingPoll = {
      id: 'poll-456',
      ...testPollData,
      created_by: mockUser.id,
      is_active: true,
      allow_multiple_votes: false,
      total_votes: 1,
      unique_voters: 1,
      option_counts: { '0': 1 },
    };

    const existingVote = {
      id: 'vote-existing',
      poll_id: 'poll-456',
      option_index: 0,
      option_text: 'JavaScript',
      voter_id: mockUser.id,
    };

    // Mock poll fetch
    mockServerSupabaseClient.from
      .mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: existingPoll,
              error: null,
            }),
          }),
        }),
      })
      // Mock existing vote found
      .mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: existingVote,
              error: null,
            }),
          }),
        }),
      });

    const duplicateVoteRequest = new NextRequest('http://localhost:3000/api/polls/poll-456/vote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token',
      },
      body: JSON.stringify({
        option_index: 1,
      }),
    });

    const duplicateVoteParams = Promise.resolve({ id: 'poll-456' });
    const duplicateVoteResponse = await SubmitVote(duplicateVoteRequest, { params: duplicateVoteParams });
    const duplicateVoteData = await duplicateVoteResponse.json();

    expect(duplicateVoteResponse.status).toBe(409);
    expect(duplicateVoteData.error).toBe('You have already voted on this poll');
  });

  it('should handle anonymous voting flow', async () => {
    const publicPoll = {
      id: 'poll-public',
      ...testPollData,
      created_by: 'other-user',
      is_active: true,
      total_votes: 0,
      unique_voters: 0,
      option_counts: {},
    };

    const anonymousVote = {
      id: 'vote-anon',
      poll_id: 'poll-public',
      option_index: 1,
      option_text: 'Python',
      voter_ip: '192.168.1.1',
      user_agent: 'Test Browser',
      created_at: new Date().toISOString(),
    };

    // Mock anonymous vote submission (no auth header)
    mockServerSupabaseClient.from
      .mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: publicPoll,
              error: null,
            }),
          }),
        }),
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' },
            }),
          }),
        }),
      })
      .mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: anonymousVote,
              error: null,
            }),
          }),
        }),
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { ...publicPoll, total_votes: 1, unique_voters: 1, option_counts: { '1': 1 } },
              error: null,
            }),
          }),
        }),
      });

    const anonymousVoteRequest = new NextRequest('http://localhost:3000/api/polls/poll-public/vote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // No Authorization header for anonymous voting
      },
      body: JSON.stringify({
        option_index: 1,
        voter_ip: '192.168.1.1',
        user_agent: 'Test Browser',
      }),
    });

    const anonymousVoteParams = Promise.resolve({ id: 'poll-public' });
    const anonymousVoteResponse = await SubmitVote(anonymousVoteRequest, { params: anonymousVoteParams });
    const anonymousVoteData = await anonymousVoteResponse.json();

    expect(anonymousVoteResponse.status).toBe(200);
    expect(anonymousVoteData.success).toBe(true);
    expect(anonymousVoteData.vote.voter_ip).toBe('192.168.1.1');
    expect(anonymousVoteData.vote.option_text).toBe('Python');
  });
});
