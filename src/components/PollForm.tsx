'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function PollForm() {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Parse options from comma-separated string
      const optionsArray = options
        .split(',')
        .map(option => option.trim())
        .filter(option => option.length > 0);

      if (optionsArray.length < 2) {
        throw new Error('Please provide at least 2 options');
      }

      // TODO: Handle form submission to create poll via API
      const response = await fetch('/api/polls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          options: optionsArray,
          created_by: 'placeholder-user-id', // TODO: Get from auth context
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create poll');
      }

      // TODO: Handle successful creation (redirect, show success message, etc.)
      console.log('Poll created:', data);
      
      // Reset form
      setQuestion('');
      setOptions('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Your Poll</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="question">Poll Question</Label>
            <Input
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What would you like to ask?"
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="options">Options (comma-separated)</Label>
            <Textarea
              id="options"
              value={options}
              onChange={(e) => setOptions(e.target.value)}
              placeholder="Option 1, Option 2, Option 3..."
              rows={4}
              required
              disabled={loading}
            />
            <p className="text-sm text-gray-600">
              Separate each option with a comma. Minimum 2 options required.
            </p>
          </div>
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating...' : 'Create Poll'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
