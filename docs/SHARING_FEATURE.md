# Advanced Poll Sharing Feature

## Overview

The ALX Polly application now includes a comprehensive sharing system that allows users to easily share their polls through multiple channels. This feature enhances user engagement and poll discoverability.

## Features

### 🔗 Shareable Links
- **Automatic URL Generation**: Each poll gets a unique, clean URL
- **One-Click Copy**: Copy poll links to clipboard with visual feedback
- **Tracking Parameters**: Optional tracking parameters for analytics

### 📱 QR Code Generation
- **Dynamic QR Codes**: Generate QR codes for each poll
- **Downloadable Images**: Save QR codes as PNG files
- **Customizable Size**: Adjustable QR code dimensions
- **Error Correction**: Medium error correction level for reliability

### 🌐 Social Media Integration
- **Twitter/X**: Direct sharing with poll title and link
- **Facebook**: Native Facebook sharing integration
- **LinkedIn**: Professional network sharing
- **WhatsApp**: Mobile messaging sharing

### 📊 Share Analytics
- **Event Tracking**: Record all sharing activities
- **Platform Analytics**: Track which sharing methods are most popular
- **Anonymous Tracking**: Support for anonymous sharing analytics
- **Real-time Updates**: Live analytics dashboard

## Technical Implementation

### Core Components

#### ShareModal Component (`src/components/ShareModal.tsx`)
```tsx
<ShareModal
  poll={pollData}
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
/>
```

**Features:**
- Modal dialog with multiple sharing options
- QR code generation and display
- Social media sharing buttons
- Link copying with success feedback
- Analytics tracking integration

#### Utility Functions (`src/lib/utils.ts`)

**QR Code Generation:**
```typescript
const qrCodeDataUrl = await generateQRCode('https://example.com/poll/123', 256);
```

**Social Media URLs:**
```typescript
const twitterUrl = generateSocialShareUrl(url, title, 'twitter');
```

**Clipboard Operations:**
```typescript
const success = await copyToClipboard('https://example.com/poll/123');
```

### API Endpoints

#### Share Analytics (`/api/polls/[id]/share`)
```typescript
POST /api/polls/123e4567-e89b-12d3-a456-426614174000/share
{
  "share_type": "social",
  "platform": "twitter",
  "shared_by": "user-uuid" // optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Share event recorded successfully",
  "data": {
    "poll_id": "123e4567-e89b-12d3-a456-426614174000",
    "share_type": "social",
    "platform": "twitter"
  }
}
```

### Database Schema

#### Shares Table
```sql
CREATE TABLE shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
  poll_title TEXT NOT NULL,
  share_type TEXT NOT NULL, -- 'link', 'qr', 'social', 'email'
  platform TEXT NOT NULL, -- 'clipboard', 'twitter', 'facebook', etc.
  shared_by UUID REFERENCES auth.users(id),
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### Share Analytics Table
```sql
CREATE TABLE share_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE UNIQUE,
  total_shares INTEGER DEFAULT 0,
  shares_by_type JSONB DEFAULT '{}',
  shares_by_platform JSONB DEFAULT '{}',
  unique_sharers INTEGER DEFAULT 0,
  last_share_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

## Usage Examples

### Basic Sharing
```typescript
// Open share modal for a poll
const handleShareClick = (poll: PollResult) => {
  setSelectedPoll(poll);
  setIsShareModalOpen(true);
};
```

### QR Code Generation
```typescript
// Generate QR code for poll sharing
useEffect(() => {
  const generateQR = async () => {
    const qrCode = await generateQRCode(pollUrl, 256);
    setQrCodeUrl(qrCode);
  };
  generateQR();
}, [pollUrl]);
```

### Social Media Sharing
```typescript
// Share to Twitter
const handleTwitterShare = () => {
  const url = generateSocialShareUrl(pollUrl, pollTitle, 'twitter');
  window.open(url, '_blank');
};
```

## Analytics Integration

### Tracking Share Events
All sharing activities are automatically tracked:

```typescript
// Link copying
await fetch(`/api/polls/${pollId}/share`, {
  method: 'POST',
  body: JSON.stringify({
    share_type: 'link',
    platform: 'clipboard'
  })
});

// Social media shares
await fetch(`/api/polls/${pollId}/share`, {
  method: 'POST',
  body: JSON.stringify({
    share_type: 'social',
    platform: 'twitter'
  })
});
```

### Analytics Data Structure
```json
{
  "total_shares": 25,
  "shares_by_type": {
    "link": 12,
    "qr": 5,
    "social": 8
  },
  "shares_by_platform": {
    "clipboard": 12,
    "twitter": 4,
    "facebook": 3,
    "download": 5,
    "whatsapp": 1
  },
  "unique_sharers": 18,
  "last_share_at": "2024-01-15T10:30:00Z"
}
```

## Security Considerations

### Authentication
- JWT token validation for authenticated users
- Anonymous sharing support with IP-based tracking
- Row Level Security (RLS) policies on share data

### Data Privacy
- IP addresses stored for analytics (consider GDPR compliance)
- User agent strings for device analytics
- Optional user identification for authenticated shares

### Rate Limiting
Consider implementing rate limiting for share analytics to prevent abuse:

```typescript
// Example rate limiting middleware
const shareRateLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 share events per windowMs
  message: 'Too many share events, please try again later.'
};
```

## Future Enhancements

### Advanced Analytics
- Geographic distribution of shares
- Time-based analytics (peak sharing times)
- Conversion tracking (shares → votes)
- A/B testing for share button placement

### Additional Platforms
- Instagram Stories integration
- TikTok sharing
- Discord webhooks
- Email sharing with templates

### Share Campaigns
- Custom share campaigns with unique tracking
- Share goals and targets
- Automated follow-up emails
- Share performance reports

## Testing

### Unit Tests
```bash
npm test src/components/ShareModal.test.tsx
npm test src/lib/utils.test.ts
```

### Integration Tests
```bash
npm test src/__tests__/integration/sharing-flow.test.ts
```

### API Tests
```bash
npm test src/app/api/polls/[id]/share/route.test.ts
```

## Deployment Notes

### Database Migration
Run the share tracking migration:

```sql
-- Execute the migration script
\i database/add-share-tracking.sql
```

### Environment Variables
No additional environment variables are required for basic sharing functionality.

### Performance Considerations
- QR code generation is cached in the component state
- Share analytics are recorded asynchronously to avoid blocking UI
- Consider implementing background job processing for high-volume sharing

## Troubleshooting

### Common Issues

**QR Code Not Generating:**
- Check network connectivity
- Verify QR code library installation
- Check browser console for errors

**Share Analytics Not Recording:**
- Verify API endpoint accessibility
- Check database permissions
- Review server logs for errors

**Social Media Links Not Working:**
- Ensure popup blockers are disabled
- Check social media platform policies
- Verify URL encoding

### Debug Mode
Enable debug logging for share analytics:

```typescript
// In development mode
console.log('Share event:', shareData);
```

## Conclusion

The advanced sharing feature significantly enhances the poll creation and distribution experience, providing users with multiple convenient ways to share their polls while collecting valuable analytics data for platform improvement.
