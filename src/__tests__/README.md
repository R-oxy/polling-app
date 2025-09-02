# Test Suite Documentation

This directory contains comprehensive tests for the ALX Polly polling application.

## Test Structure

### Unit Tests
Located in `__tests__` folders next to the components/modules they test:

- **API Route Tests**: `src/app/api/polls/__tests__/` and `src/app/api/polls/[id]/vote/__tests__/`
- **Component Tests**: `src/components/__tests__/`

### Integration Tests
Located in `src/__tests__/integration/`:

- **Voting Flow Test**: Complete end-to-end voting workflow

## Test Categories

### 1. Voting API Tests (`src/app/api/polls/[id]/vote/__tests__/route.test.ts`)

**Unit Tests:**
- ✅ Successful vote submission (authenticated)
- ✅ Vote rejection for inactive polls
- ✅ Vote rejection for expired polls  
- ✅ Duplicate vote prevention
- ✅ Option index validation
- ✅ Anonymous voting support
- ✅ Vote status checking

**Coverage:**
- Happy path: Valid vote submission
- Edge cases: Expired polls, inactive polls, duplicate votes
- Failure cases: Invalid options, authentication errors

### 2. Poll Creation API Tests (`src/app/api/polls/__tests__/route.test.ts`)

**Unit Tests:**
- ✅ Successful poll creation
- ✅ Authentication requirement
- ✅ Title length validation
- ✅ Question length validation
- ✅ Option count validation (min/max)
- ✅ Empty option cleanup
- ✅ User poll fetching

**Coverage:**
- Happy path: Valid poll creation and retrieval
- Edge cases: Empty options, boundary values
- Failure cases: Missing auth, invalid data

### 3. Navigation Component Tests (`src/components/__tests__/Navigation.test.tsx`)

**Unit Tests:**
- ✅ Unauthenticated state rendering
- ✅ Authenticated state rendering
- ✅ First name extraction from email
- ✅ User avatar initial display
- ✅ Sign out functionality
- ✅ Loading states
- ✅ Error handling
- ✅ Responsive design classes

**Coverage:**
- Happy path: Normal navigation usage
- Edge cases: Various email formats, loading states
- Failure cases: Sign out errors

### 4. Integration Tests (`src/__tests__/integration/voting-flow.test.ts`)

**Complete Workflow Tests:**
- ✅ Full voting flow (create → view → vote → verify)
- ✅ Duplicate vote prevention workflow
- ✅ Anonymous voting workflow

**Coverage:**
- Happy path: Complete user journey
- Edge cases: Anonymous users, existing votes
- Failure cases: Duplicate voting attempts

## Running Tests

### All Tests
```bash
npm test
```

### Watch Mode (for development)
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

### Specific Test Files
```bash
# API tests only
npm test -- --testPathPattern=api

# Component tests only  
npm test -- --testPathPattern=components

# Integration tests only
npm test -- --testPathPattern=integration
```

## Test Configuration

### Jest Configuration (`jest.config.js`)
- Uses Next.js Jest configuration
- JSDOM environment for React components
- TypeScript support
- Path mapping for `@/` imports
- Coverage collection from `src/` directory

### Setup (`jest.setup.js`)
- Testing Library DOM matchers
- Next.js router mocks
- Supabase client mocks
- Environment variable mocks

## Mock Strategy

### Supabase Mocking
- **Client-side**: Mocked for authentication verification
- **Server-side**: Mocked for database operations
- **Flexible**: Supports both authenticated and anonymous scenarios

### Next.js Mocking
- **Router**: Mocked navigation functions
- **Link**: Simplified anchor tag implementation
- **Context**: Auth context mocked for different user states

## Test Data

### Mock Users
```typescript
const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
};
```

### Mock Polls
```typescript
const testPollData = {
  title: 'Test Poll',
  question: 'Test Question?',
  options: ['Option 1', 'Option 2'],
  allow_multiple_votes: false,
};
```

### Mock Votes
```typescript
const submittedVote = {
  id: 'vote-123',
  poll_id: 'poll-123',
  option_index: 1,
  option_text: 'Option 2',
  voter_id: 'user-123',
};
```

## Coverage Goals

- **API Routes**: 90%+ coverage
- **Components**: 85%+ coverage  
- **Integration**: Key user flows covered
- **Edge Cases**: All validation scenarios tested
- **Error Handling**: All error paths tested

## Best Practices

1. **Descriptive Test Names**: Tests clearly describe what they're testing
2. **Arrange-Act-Assert**: Clear test structure
3. **Mock Isolation**: Each test has isolated mocks
4. **Real Scenarios**: Tests mirror actual user behavior
5. **Error Testing**: Both success and failure cases covered

## Adding New Tests

When adding new features, ensure:

1. **Unit Tests**: Test individual functions/components
2. **Integration Tests**: Test feature workflows
3. **Edge Cases**: Test boundary conditions
4. **Error Cases**: Test failure scenarios
5. **Mock Updates**: Update mocks for new dependencies

## Continuous Integration

Tests are designed to run in CI/CD environments:
- No external dependencies
- Consistent mock data
- Deterministic results
- Fast execution
