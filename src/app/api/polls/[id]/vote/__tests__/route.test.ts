import { POST, GET } from '../route';
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Mock the Supabase clients
jest.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
          order: jest.fn(() => ({
            single: jest.fn(),
          })),
        })),
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(),
          })),
        })),
      })),
    })),
  })),
}));

describe('/api/polls/[id]/vote', () => {
  let mockSupabaseClient: any;
  let mockServerSupabaseClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock client-side Supabase (for auth verification)
    mockSupabaseClient = {
      auth: {
        getUser: jest.fn(),
      },
    };
    
    // Mock server-side Supabase (for database operations)
    mockServerSupabaseClient = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(),
            order: jest.fn(() => ({
              single: jest.fn(),
            })),
          })),
          insert: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn(),
            })),
          })),
        })),
      })),
    };

    (createClient as jest.Mock).mockReturnValue(mockSupabaseClient);
    require('@/lib/supabase').createServerSupabaseClient.mockReturnValue(mockServerSupabaseClient);
  });

  describe('POST - Submit Vote', () => {
    const mockPoll = {
      id: 'poll-123',
      question: 'Test Question?',
      options: ['Option 1', 'Option 2', 'Option 3'],
      is_active: true,
      expires_at: null,
      allow_multiple_votes: false,
    };

    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    };

    it('should successfully submit a vote for authenticated user', async () => {
      // Mock authenticated user
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock poll fetch
      const mockPollQuery = {
        single: jest.fn().mockResolvedValue({
          data: mockPoll,
          error: null,
        }),
      };
      mockServerSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue(mockPollQuery),
        }),
      });

      // Mock existing vote check (no existing vote)
      const mockExistingVoteQuery = {
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' }, // No rows returned
        }),
      };

      // Mock vote insertion
      const mockVoteInsert = {
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'vote-123',
            poll_id: 'poll-123',
            option_index: 1,
            option_text: 'Option 2',
            voter_id: 'user-123',
            created_at: new Date().toISOString(),
          },
          error: null,
        }),
      };

      // Mock analytics and updated poll fetch
      const mockAnalytics = {
        poll_id: 'poll-123',
        total_votes: 1,
        unique_voters: 1,
        option_counts: { '1': 1 },
      };

      const mockUpdatedPoll = {
        ...mockPoll,
        total_votes: 1,
        unique_voters: 1,
        option_counts: { '1': 1 },
      };

      // Set up the chain of mocked calls
      mockServerSupabaseClient.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue(mockPollQuery),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue(mockExistingVoteQuery),
          }),
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue(mockVoteInsert),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockAnalytics,
                error: null,
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockUpdatedPoll,
                error: null,
              }),
            }),
          }),
        });

      const request = new NextRequest('http://localhost:3000/api/polls/poll-123/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
          option_index: 1,
        }),
      });

      const params = Promise.resolve({ id: 'poll-123' });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.vote.option_index).toBe(1);
      expect(data.vote.option_text).toBe('Option 2');
      expect(data.message).toBe('Vote submitted successfully!');
    });

    it('should reject vote for inactive poll', async () => {
      const inactivePoll = { ...mockPoll, is_active: false };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockPollQuery = {
        single: jest.fn().mockResolvedValue({
          data: inactivePoll,
          error: null,
        }),
      };

      mockServerSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue(mockPollQuery),
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/polls/poll-123/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
          option_index: 1,
        }),
      });

      const params = Promise.resolve({ id: 'poll-123' });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('This poll is not accepting votes');
    });

    it('should reject vote for expired poll', async () => {
      const expiredPoll = {
        ...mockPoll,
        expires_at: new Date(Date.now() - 86400000).toISOString(), // Yesterday
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockPollQuery = {
        single: jest.fn().mockResolvedValue({
          data: expiredPoll,
          error: null,
        }),
      };

      mockServerSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue(mockPollQuery),
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/polls/poll-123/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
          option_index: 1,
        }),
      });

      const params = Promise.resolve({ id: 'poll-123' });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('This poll has expired');
    });

    it('should reject duplicate vote when multiple votes not allowed', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock poll fetch
      const mockPollQuery = {
        single: jest.fn().mockResolvedValue({
          data: mockPoll,
          error: null,
        }),
      };

      // Mock existing vote found
      const mockExistingVoteQuery = {
        single: jest.fn().mockResolvedValue({
          data: { id: 'existing-vote-123' },
          error: null,
        }),
      };

      mockServerSupabaseClient.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue(mockPollQuery),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue(mockExistingVoteQuery),
          }),
        });

      const request = new NextRequest('http://localhost:3000/api/polls/poll-123/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
          option_index: 1,
        }),
      });

      const params = Promise.resolve({ id: 'poll-123' });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe('You have already voted on this poll');
    });

    it('should validate option index bounds', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockPollQuery = {
        single: jest.fn().mockResolvedValue({
          data: mockPoll,
          error: null,
        }),
      };

      mockServerSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue(mockPollQuery),
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/polls/poll-123/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
          option_index: 99, // Out of bounds
        }),
      });

      const params = Promise.resolve({ id: 'poll-123' });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid option selected');
    });

    it('should handle anonymous voting', async () => {
      // Mock no auth header (anonymous user)
      const mockPollQuery = {
        single: jest.fn().mockResolvedValue({
          data: mockPoll,
          error: null,
        }),
      };

      const mockExistingVoteQuery = {
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      };

      const mockVoteInsert = {
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'vote-123',
            poll_id: 'poll-123',
            option_index: 0,
            option_text: 'Option 1',
            voter_ip: '192.168.1.1',
            created_at: new Date().toISOString(),
          },
          error: null,
        }),
      };

      mockServerSupabaseClient.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue(mockPollQuery),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue(mockExistingVoteQuery),
          }),
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue(mockVoteInsert),
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
                data: mockPoll,
                error: null,
              }),
            }),
          }),
        });

      const request = new NextRequest('http://localhost:3000/api/polls/poll-123/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          option_index: 0,
          voter_ip: '192.168.1.1',
          user_agent: 'Test Browser',
        }),
      });

      const params = Promise.resolve({ id: 'poll-123' });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.vote.voter_ip).toBe('192.168.1.1');
    });
  });

  describe('GET - Check Vote Status', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    };

    it('should return vote status for authenticated user', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockUserVote = {
        id: 'vote-123',
        option_index: 1,
        option_text: 'Option 2',
        created_at: new Date().toISOString(),
      };

      const mockVoteQuery = {
        single: jest.fn().mockResolvedValue({
          data: mockUserVote,
          error: null,
        }),
      };

      mockServerSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue(mockVoteQuery),
          }),
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/polls/poll-123/vote', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      const params = Promise.resolve({ id: 'poll-123' });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.hasVoted).toBe(true);
      expect(data.userVote).toEqual(mockUserVote);
    });

    it('should return false for unauthenticated user', async () => {
      const request = new NextRequest('http://localhost:3000/api/polls/poll-123/vote', {
        method: 'GET',
      });

      const params = Promise.resolve({ id: 'poll-123' });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.hasVoted).toBe(false);
    });
  });
});
