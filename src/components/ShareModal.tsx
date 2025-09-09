'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  generateQRCode,
  generateShareableUrl,
  copyToClipboard,
  generateSocialShareUrl,
} from '@/lib/utils';
import { PollResult } from '@/types';
import {
  Copy,
  QrCode,
  Share2,
  Twitter,
  Facebook,
  Linkedin,
  MessageCircle,
  Check,
  Download,
  Link as LinkIcon
} from 'lucide-react';

interface ShareModalProps {
  poll: PollResult;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * ShareModal Component - Advanced Poll Sharing Interface
 *
 * Provides a comprehensive sharing interface for polls with multiple options:
 * - Copy link to clipboard
 * - Generate and display QR code
 * - Share to social media platforms
 * - Download QR code image
 * - Track sharing analytics
 *
 * @component ShareModal
 * @param {PollResult} poll - The poll data to share
 * @param {boolean} isOpen - Whether the modal is open
 * @param {function} onClose - Function to close the modal
 * @returns {JSX.Element} Share modal with multiple sharing options
 *
 * @example
 * ```tsx
 * const [isShareModalOpen, setIsShareModalOpen] = useState(false);
 * const poll = { id: '123', title: 'My Poll', ... };
 *
 * return (
 *   <ShareModal
 *     poll={poll}
 *     isOpen={isShareModalOpen}
 *     onClose={() => setIsShareModalOpen(false)}
 *   />
 * );
 * ```
 */
export function ShareModal({ poll, isOpen, onClose }: ShareModalProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  // Generate share URL and QR code when modal opens
  useEffect(() => {
    if (isOpen && poll?.id) {
      const url = generateShareableUrl(poll.id);
      setShareUrl(url);

      // Generate QR code
      const generateQR = async () => {
        setIsGeneratingQR(true);
        try {
          const qrCode = await generateQRCode(url, 256);
          setQrCodeUrl(qrCode);
        } catch (error) {
          console.error('Failed to generate QR code:', error);
        } finally {
          setIsGeneratingQR(false);
        }
      };

      generateQR();
    }
  }, [isOpen, poll?.id]);

  /**
   * Copy the poll URL to clipboard and track the share event
   */
  const handleCopyLink = async () => {
    const success = await copyToClipboard(shareUrl);
    if (success) {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);

      // Track share analytics
      try {
        await fetch(`/api/polls/${poll.id}/share`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            share_type: 'link',
            platform: 'clipboard'
          })
        });
      } catch (error) {
        console.error('Failed to track share analytics:', error);
      }
    }
  };

  /**
   * Download the QR code as an image and track the share event
   */
  const handleDownloadQR = () => {
    if (!qrCodeUrl) return;

    const link = document.createElement('a');
    link.download = `poll-qr-${poll.id}.png`;
    link.href = qrCodeUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Track QR code download analytics
    try {
      fetch(`/api/polls/${poll.id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          share_type: 'qr',
          platform: 'download'
        })
      }).catch(error => console.error('Failed to track QR download:', error));
    } catch (error) {
      console.error('Failed to track QR download analytics:', error);
    }
  };

  /**
   * Share to social media platform and track the share event
   */
  const handleSocialShare = async (platform: 'twitter' | 'facebook' | 'linkedin' | 'whatsapp') => {
    const shareText = `Check out this poll: "${poll.title}"`;
    const url = generateSocialShareUrl(shareUrl, shareText, platform);
    window.open(url, '_blank', 'noopener,noreferrer');

    // Track social media share analytics
    try {
      await fetch(`/api/polls/${poll.id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          share_type: 'social',
          platform: platform
        })
      });
    } catch (error) {
      console.error('Failed to track social share analytics:', error);
    }
  };

  const shareTitle = poll?.title || 'Poll';
  const shareDescription = poll?.question || 'Take this poll!';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Poll
          </DialogTitle>
          <DialogDescription>
            Share "{shareTitle}" with others using the options below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Link Section */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              Poll Link
            </Label>
            <div className="flex gap-2">
              <Input
                value={shareUrl}
                readOnly
                className="flex-1"
              />
              <Button
                onClick={handleCopyLink}
                variant="outline"
                size="sm"
                className="shrink-0"
              >
                {copySuccess ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* QR Code Section */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <QrCode className="h-4 w-4" />
              QR Code
            </Label>
            <div className="flex flex-col items-center space-y-3 p-4 bg-gray-50 rounded-lg">
              {isGeneratingQR ? (
                <div className="w-32 h-32 bg-gray-200 animate-pulse rounded flex items-center justify-center">
                  <QrCode className="h-8 w-8 text-gray-400" />
                </div>
              ) : qrCodeUrl ? (
                <>
                  <img
                    src={qrCodeUrl}
                    alt={`QR code for poll: ${shareTitle}`}
                    className="w-32 h-32"
                  />
                  <Button
                    onClick={handleDownloadQR}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download QR
                  </Button>
                </>
              ) : (
                <div className="w-32 h-32 bg-red-50 border border-red-200 rounded flex items-center justify-center">
                  <span className="text-red-500 text-sm">Failed to load QR</span>
                </div>
              )}
            </div>
          </div>

          {/* Social Media Sharing */}
          <div className="space-y-2">
            <Label>Share on Social Media</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => handleSocialShare('twitter')}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Twitter className="h-4 w-4" />
                Twitter
              </Button>
              <Button
                onClick={() => handleSocialShare('facebook')}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Facebook className="h-4 w-4" />
                Facebook
              </Button>
              <Button
                onClick={() => handleSocialShare('linkedin')}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Linkedin className="h-4 w-4" />
                LinkedIn
              </Button>
              <Button
                onClick={() => handleSocialShare('whatsapp')}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </Button>
            </div>
          </div>

          {/* Poll Preview */}
          <div className="space-y-2 p-3 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-sm text-blue-900">Poll Preview</h4>
            <p className="text-sm text-blue-800 font-medium">{shareTitle}</p>
            <p className="text-sm text-blue-700">{shareDescription}</p>
            <div className="text-xs text-blue-600 mt-1">
              {poll?.total_votes || 0} votes • {poll?.unique_voters || 0} voters
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
