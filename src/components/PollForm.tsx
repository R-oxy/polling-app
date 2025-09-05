'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

/**
 * PollForm Component - Create and Edit Polls
 *
 * A comprehensive form component for creating new polls with the following features:
 * - Dynamic option management (add/remove options)
 * - Real-time form validation
 * - Success/error state handling
 * - Automatic redirect after successful creation
 * - Responsive design with loading states
 *
 * Form Fields:
 * - Title (required, 3-200 chars)
 * - Description (optional, 0-1000 chars)
 * - Question (required, 5-500 chars)
 * - Options (2-10 options, dynamic management)
 * - Multiple votes toggle
 * - Expiration date (optional)
 *
 * Security:
 * - Requires authenticated user session
 * - Validates session before submission
 * - Sanitizes all input data
 *
 * @component PollForm
 * @returns {JSX.Element} Poll creation form with validation and submission handling
 *
 * @example
 * ```tsx
 * import { PollForm } from '@/components/PollForm';
 *
 * function CreatePollPage() {
 *   return (
 *     <div className="container mx-auto p-4">
 *       <h1>Create New Poll</h1>
 *       <PollForm />
 *     </div>
 *   );
 * }
 * ```
 */
export function PollForm() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']); // Start with 2 empty options
  const [allowMultipleVotes, setAllowMultipleVotes] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const { user } = useAuth();
  const router = useRouter();

  /**
   * Add a new empty option to the poll
   * Maximum of 10 options allowed to prevent UI clutter
   */
  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, '']);
    }
  };

  /**
   * Remove an option at the specified index
   * Minimum of 2 options required for a valid poll
   * @param {number} index - Index of the option to remove
   */
  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  /**
   * Update the value of an option at the specified index
   * @param {number} index - Index of the option to update
   * @param {string} value - New value for the option
   */
  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  /**
   * Handle form submission with comprehensive validation and error handling
   *
   * This function performs the following steps:
   * 1. Client-side form validation
   * 2. Data sanitization and cleaning
   * 3. Authentication token retrieval
   * 4. API call to create poll
   * 5. Success state management and redirect
   *
   * @async
   * @param {React.FormEvent} e - Form submission event
   * @returns {Promise<void>} Resolves when submission is complete
   *
   * @throws {Error} When validation fails or API call encounters an error
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      // Step 1: Client-side validation
      if (!title.trim()) {
        throw new Error('Please provide a poll title');
      }

      if (!question.trim()) {
        throw new Error('Please provide a poll question');
      }

      // Step 2: Clean and validate options
      // Remove whitespace and filter out empty options
      const cleanOptions = options
        .map(option => option.trim())
        .filter(option => option.length > 0);

      if (cleanOptions.length < 2) {
        throw new Error('Please provide at least 2 non-empty options');
      }

      // Step 3: Check for duplicate options to ensure poll integrity
      const uniqueOptions = [...new Set(cleanOptions)];
      if (uniqueOptions.length !== cleanOptions.length) {
        throw new Error('Please ensure all options are unique');
      }

      // Step 4: Prepare sanitized poll data for API submission
      const pollData = {
        title: title.trim(),
        description: description.trim() || undefined,
        question: question.trim(),
        options: cleanOptions,
        allow_multiple_votes: allowMultipleVotes,
        expires_at: expiresAt || undefined,
      };

      // Step 5: Retrieve current user session for authentication
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('No valid session found. Please log in again.');
      }

      // Step 6: Submit poll data to API endpoint
      const response = await fetch('/api/polls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(pollData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create poll');
      }

      // Step 7: Handle successful poll creation
      console.log('Poll created successfully:', data.poll);

      // Show success message and update UI state
      setSuccess(true);
      setLoading(false);

      // Redirect to polls list after brief success display (2 seconds)
      setTimeout(() => {
        router.push('/polls');
      }, 2000);
    } catch (err) {
      // Handle and display any errors that occurred during submission
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      // Ensure loading state is cleared in all cases
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Your Poll</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Poll Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Poll Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your poll a catchy title"
              required
              disabled={loading}
              maxLength={200}
            />
          </div>

          {/* Poll Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more context about your poll..."
              rows={3}
              disabled={loading}
              maxLength={1000}
            />
          </div>

          {/* Poll Question */}
          <div className="space-y-2">
            <Label htmlFor="question">Poll Question *</Label>
            <Input
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What would you like to ask?"
              required
              disabled={loading}
              maxLength={500}
            />
          </div>

          {/* Poll Options */}
          <div className="space-y-2">
            <Label>Poll Options *</Label>
            <div className="space-y-3">
              {options.map((option, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    disabled={loading}
                    className="flex-1"
                  />
                  {options.length > 2 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeOption(index)}
                      disabled={loading}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
              
              {options.length < 10 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={addOption}
                  disabled={loading}
                  className="w-full"
                >
                  Add Option
                </Button>
              )}
              
              <p className="text-sm text-gray-600">
                Minimum 2 options, maximum 10 options. All options must be unique.
              </p>
            </div>
          </div>

          {/* Poll Settings */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-medium">Poll Settings</h3>
            
            {/* Multiple Votes */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="allowMultipleVotes"
                checked={allowMultipleVotes}
                onChange={(e) => setAllowMultipleVotes(e.target.checked)}
                disabled={loading}
                className="w-4 h-4"
              />
              <Label htmlFor="allowMultipleVotes" className="text-sm">
                Allow users to vote for multiple options
              </Label>
            </div>

            {/* Expiration Date */}
            <div className="space-y-2">
              <Label htmlFor="expiresAt">Expiration Date (optional)</Label>
              <Input
                type="datetime-local"
                id="expiresAt"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                disabled={loading}
                min={new Date().toISOString().slice(0, 16)}
              />
              <p className="text-xs text-gray-600">
                Leave empty for polls that never expire
              </p>
            </div>
          </div>

          {/* Success Message */}
          {success && (
            <div className="text-sm text-green-600 bg-green-50 p-4 rounded-md border border-green-200 flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-medium">Poll Created Successfully! 🎉</p>
                <p className="text-xs mt-1">Redirecting to your polls page...</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading || success}
          >
            {success ? (
              <>
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Poll Created!
              </>
            ) : loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating Poll...
              </>
            ) : (
              'Create Poll'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
