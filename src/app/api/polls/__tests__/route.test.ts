import { POST, GET } from '../route';
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Mock the Supabase clients
jest.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
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

describe('/api/polls', () => {
  let mockSupabaseClient: any;
  let mockServerSupabaseClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockSupabaseClient = {
      auth: {
        getUser: jest.fn(),
      },
    };
    
    mockServerSupabaseClient = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
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

  describe('POST - Create Poll', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    };

    const validPollData = {
      title: 'Test Poll',
      description: 'This is a test poll',
      question: 'What is your favorite color?',
      options: ['Red', 'Blue', 'Green'],
      allow_multiple_votes: false,
      expires_at: null,
    };

    it('should successfully create a poll with valid data', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockCreatedPoll = {
        id: 'poll-123',
        ...validPollData,
        created_by: mockUser.id,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        poll_analytics: null,
      };

      const mockInsertQuery = {
        single: jest.fn().mockResolvedValue({
          data: mockCreatedPoll,
          error: null,
        }),
      };

      mockServerSupabaseClient.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue(mockInsertQuery),
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/polls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify(validPollData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.poll.title).toBe(validPollData.title);
      expect(data.poll.question).toBe(validPollData.question);
      expect(data.poll.options).toEqual(validPollData.options);
      expect(data.poll.created_by).toBe(mockUser.id);
    });

    it('should reject poll creation without authentication', async () => {
      const request = new NextRequest('http://localhost:3000/api/polls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validPollData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authorization header required');
    });

    it('should validate title length', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const invalidPollData = {
        ...validPollData,
        title: 'Hi', // Too short
      };

      const request = new NextRequest('http://localhost:3000/api/polls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify(invalidPollData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Title must be at least 3 characters');
    });

    it('should validate question length', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const invalidPollData = {
        ...validPollData,
        question: 'Hi?', // Too short
      };

      const request = new NextRequest('http://localhost:3000/api/polls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify(invalidPollData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Question must be at least 5 characters');
    });

    it('should validate minimum number of options', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const invalidPollData = {
        ...validPollData,
        options: ['Only one option'], // Need at least 2
      };

      const request = new NextRequest('http://localhost:3000/api/polls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify(invalidPollData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('At least 2 options are required');
    });

    it('should validate maximum number of options', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const invalidPollData = {
        ...validPollData,
        options: Array.from({ length: 11 }, (_, i) => `Option ${i + 1}`), // Too many
      };

      const request = new NextRequest('http://localhost:3000/api/polls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify(invalidPollData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Maximum 10 options allowed');
    });

    it('should clean empty options', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const pollDataWithEmptyOptions = {
        ...validPollData,
        options: ['Red', '', 'Blue', '   ', 'Green'], // Contains empty options
      };

      const mockCreatedPoll = {
        id: 'poll-123',
        ...validPollData,
        options: ['Red', 'Blue', 'Green'], // Cleaned options
        created_by: mockUser.id,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        poll_analytics: null,
      };

      const mockInsertQuery = {
        single: jest.fn().mockResolvedValue({
          data: mockCreatedPoll,
          error: null,
        }),
      };

      mockServerSupabaseClient.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue(mockInsertQuery),
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/polls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify(pollDataWithEmptyOptions),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.poll.options).toEqual(['Red', 'Blue', 'Green']);
    });
  });

  describe('GET - Fetch User Polls', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    };

    it('should fetch user polls successfully', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockPolls = [
        {
          id: 'poll-1',
          title: 'Poll 1',
          question: 'Question 1?',
          options: ['A', 'B'],
          created_by: mockUser.id,
          total_votes: 5,
          unique_voters: 3,
          option_counts: { '0': 2, '1': 3 },
          created_at: new Date().toISOString(),
        },
        {
          id: 'poll-2',
          title: 'Poll 2',
          question: 'Question 2?',
          options: ['X', 'Y', 'Z'],
          created_by: mockUser.id,
          total_votes: 10,
          unique_voters: 8,
          option_counts: { '0': 3, '1': 4, '2': 3 },
          created_at: new Date().toISOString(),
        },
      ];

      const mockQuery = {
        order: jest.fn().mockResolvedValue({
          data: mockPolls,
          error: null,
        }),
      };

      mockServerSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue(mockQuery),
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/polls', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.polls).toHaveLength(2);
      expect(data.polls[0].title).toBe('Poll 1');
      expect(data.polls[1].title).toBe('Poll 2');
    });

    it('should require authentication to fetch polls', async () => {
      const request = new NextRequest('http://localhost:3000/api/polls', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authorization header required');
    });

    it('should handle invalid auth token', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Invalid token'),
      });

      const request = new NextRequest('http://localhost:3000/api/polls', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer invalid-token',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Invalid or expired token');
    });
  });
});
