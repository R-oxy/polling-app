
# ALX Polly - Interactive Polling Application

![Next.js](https://img.shields.io/badge/Next.js-15.0-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Supabase](https://img.shields.io/badge/Supabase-2.0-green)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-cyan)
![Shadcn/ui](https://img.shields.io/badge/Shadcn/ui-1.0-purple)

A modern, full-stack polling application built with Next.js 13+ App Router, featuring real-time voting, user authentication, and comprehensive poll management.

## 🌟 Features

### Core Functionality
- **🔐 User Authentication** - Secure signup/login with Supabase Auth
- **📊 Poll Creation** - Create polls with multiple options, descriptions, and settings
- **🗳️ Real-time Voting** - Support for both authenticated and anonymous voting
- **📈 Live Results** - Instant vote tallying and analytics
- **🎯 Duplicate Prevention** - Smart vote validation based on user ID or IP
- **⏰ Poll Expiration** - Set expiration dates for time-limited polls
- **📱 Responsive Design** - Mobile-first design with Tailwind CSS
- **🔗 Advanced Sharing** - QR codes, social media integration, and share analytics
- **📊 Share Tracking** - Comprehensive analytics for sharing behavior

### Technical Features
- **Next.js 13+ App Router** - Modern React architecture
- **TypeScript** - Full type safety throughout the application
- **Supabase Integration** - PostgreSQL database with real-time subscriptions
- **Shadcn/ui Components** - Beautiful, accessible UI components
- **Row Level Security** - Database-level security policies
- **JWT Authentication** - Secure token-based authentication
- **API Routes** - RESTful API endpoints for all operations

## 🚀 Tech Stack

- **Frontend**: Next.js 13+, React 18, TypeScript
- **Styling**: Tailwind CSS, Shadcn/ui
- **Backend**: Next.js API Routes, Supabase
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth
- **Testing**: Jest, React Testing Library
- **Deployment**: Vercel (recommended)

## 📁 Project Structure

```
polling-app/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── polls/
│   │   │   │   ├── route.ts          # Poll CRUD operations
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts      # Poll-specific operations
│   │   │   │       └── vote/
│   │   │   │           └── route.ts  # Voting API
│   │   ├── auth/
│   │   │   ├── login/page.tsx       # Login page
│   │   │   └── register/page.tsx    # Registration page
│   │   ├── polls/
│   │   │   ├── page.tsx             # User's polls dashboard
│   │   │   ├── new/page.tsx         # Create poll page
│   │   │   └── [id]/page.tsx        # View poll page
│   │   └── layout.tsx               # Root layout with navigation
│   ├── components/
│   │   ├── ui/                      # Shadcn/ui components
│   │   ├── AuthForm.tsx             # Reusable auth form
│   │   ├── PollForm.tsx             # Poll creation form
│   │   ├── PollList.tsx             # Poll listing component
│   │   ├── PollView.tsx             # Poll display component
│   │   └── Navigation.tsx           # Main navigation bar
│   ├── contexts/
│   │   └── AuthContext.tsx          # Authentication context
│   ├── lib/
│   │   ├── supabase.ts              # Supabase client setup
│   │   └── utils.ts                 # Utility functions
│   └── types/
│       └── index.ts                 # TypeScript definitions
├── public/                          # Static assets
├── tests/                           # Test files
└── README.md
```

## 🛠️ Setup & Installation

### Prerequisites

- **Node.js 20.0.0 or higher** - Required for Next.js compatibility
- **npm, yarn, or pnpm** - Package manager
- **Supabase Account** - For database and authentication

### 1. Clone the Repository

```bash
git clone <repository-url>
cd polling-app
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

### 3. Environment Configuration

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Next.js Configuration
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3000
```

### 4. Database Setup

Run the following SQL in your Supabase SQL editor:

```sql
-- Create polls table
CREATE TABLE polls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  question TEXT NOT NULL,
  options TEXT[] NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  allow_multiple_votes BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create votes table
CREATE TABLE votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
  voter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  voter_ip INET,
  user_agent TEXT,
  option_index INTEGER NOT NULL,
  option_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create poll_analytics table
CREATE TABLE poll_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE UNIQUE,
  total_votes INTEGER DEFAULT 0,
  unique_voters INTEGER DEFAULT 0,
  option_counts JSONB DEFAULT '{}',
  last_vote_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_analytics ENABLE ROW LEVEL SECURITY;

-- Create policies for polls
CREATE POLICY "Users can view all active polls" ON polls
  FOR SELECT USING (is_active = true);

CREATE POLICY "Users can create their own polls" ON polls
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own polls" ON polls
  FOR UPDATE USING (auth.uid() = created_by);

-- Create policies for votes
CREATE POLICY "Users can view votes on polls" ON votes
  FOR SELECT USING (true);

CREATE POLICY "Users can create votes" ON votes
  FOR INSERT WITH CHECK (true);

-- Create policies for analytics
CREATE POLICY "Users can view poll analytics" ON poll_analytics
  FOR SELECT USING (true);

-- Create indexes for performance
CREATE INDEX idx_polls_created_by ON polls(created_by);
CREATE INDEX idx_polls_is_active ON polls(is_active);
CREATE INDEX idx_votes_poll_id ON votes(poll_id);
CREATE INDEX idx_votes_voter_id ON votes(voter_id);
CREATE INDEX idx_analytics_poll_id ON poll_analytics(poll_id);
```

### 5. Run the Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 📖 Usage

### Creating a Poll

1. **Sign Up/Login** - Create an account or sign in
2. **Navigate to Create Poll** - Click "Create Poll" in the navigation
3. **Fill Poll Details**:
   - **Title** (required): Give your poll a catchy title
   - **Question** (required): The main question voters will answer
   - **Options** (2-10 required): Add poll choices
   - **Description** (optional): Additional context
   - **Multiple Votes**: Allow users to select multiple options
   - **Expiration**: Set an optional expiration date
4. **Submit** - Poll is created and you're redirected to your polls list

### Voting on a Poll

1. **Browse Polls** - View available polls (authenticated or public)
2. **Select Options** - Choose your answer(s)
3. **Submit Vote** - Your vote is recorded instantly
4. **View Results** - See real-time vote tallies

### Managing Your Polls

- **My Polls**: View all polls you've created
- **Edit Polls**: Modify poll details (title, description, options)
- **View Analytics**: See voting patterns and engagement
- **Share Polls**: Advanced sharing with QR codes and social media integration

### Sharing Your Polls

The enhanced sharing system provides multiple ways to distribute your polls:

1. **Share Modal**: Click the "Share" button on any poll to open the sharing interface
2. **Copy Link**: One-click copying of poll URLs to clipboard
3. **QR Codes**: Generate and download QR codes for easy mobile access
4. **Social Media**: Direct sharing to Twitter, Facebook, LinkedIn, and WhatsApp
5. **Share Analytics**: Track how your polls are being shared and accessed

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Structure

The application includes comprehensive tests:

- **Unit Tests**: Individual function/component testing
- **Integration Tests**: End-to-end voting flow testing
- **API Tests**: Backend route testing
- **Component Tests**: UI component testing

### Test Coverage

Current test files:
- `src/components/__tests__/Navigation.test.tsx` - Navigation component tests
- `src/app/api/polls/__tests__/route.test.ts` - Poll API tests
- `src/app/api/polls/[id]/vote/__tests__/route.test.ts` - Voting API tests
- `src/__tests__/integration/voting-flow.test.ts` - Integration tests

## 🔧 API Reference

### Authentication Endpoints

- `POST /api/auth` - User authentication (handled by Supabase)

### Poll Endpoints

- `GET /api/polls` - Retrieve user's polls
- `POST /api/polls` - Create a new poll
- `GET /api/polls/[id]` - Get poll details
- `PUT /api/polls/[id]` - Update poll
- `DELETE /api/polls/[id]` - Delete poll

### Voting Endpoints

- `POST /api/polls/[id]/vote` - Submit a vote
- `GET /api/polls/[id]/vote` - Check if user has voted

### Sharing Endpoints

- `POST /api/polls/[id]/share` - Record share analytics

## 🚀 Deployment

### Vercel (Recommended)

1. **Connect Repository** - Link your GitHub repo to Vercel
2. **Environment Variables** - Add Supabase environment variables
3. **Deploy** - Automatic deployment on push to main branch

### Manual Deployment

```bash
# Build the application
npm run build

# Start production server
npm start
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Next.js** - The React framework for production
- **Supabase** - Open source Firebase alternative
- **Shadcn/ui** - Beautiful UI components
- **Tailwind CSS** - Utility-first CSS framework
- **Vercel** - Deployment platform

## 📞 Support

If you have any questions or need help:

1. Check the [Issues](https://github.com/your-repo/issues) page
2. Create a new issue with detailed information
3. Contact the maintainers

---

Built with ❤️ using Next.js, Supabase, and modern web technologies.
