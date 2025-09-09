import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import QRCode from 'qrcode'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generates a QR code for a given URL
 *
 * Creates a data URL containing the QR code image that can be displayed
 * directly in an <img> tag or used in other contexts.
 *
 * @param {string} url - The URL to encode in the QR code
 * @param {number} [size=256] - The size of the QR code in pixels (default: 256)
 * @returns {Promise<string>} A data URL containing the QR code image
 *
 * @example
 * ```typescript
 * const qrCodeDataUrl = await generateQRCode('https://example.com/poll/123');
 * // Returns: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
 * ```
 *
 * @throws {Error} If QR code generation fails
 */
export async function generateQRCode(url: string, size: number = 256): Promise<string> {
  try {
    const options = {
      width: size,
      margin: 2,
      color: {
        dark: '#000000',  // Black dots
        light: '#FFFFFF'  // White background
      },
      errorCorrectionLevel: 'M' as const // Medium error correction
    };

    const qrCodeDataUrl = await QRCode.toDataURL(url, options);
    return qrCodeDataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Generates a shareable poll URL
 *
 * Creates a properly formatted URL for sharing a poll, including the base URL
 * and poll ID. Can optionally include additional tracking parameters.
 *
 * @param {string} pollId - The unique identifier of the poll
 * @param {string} [baseUrl] - The base URL (defaults to window.location.origin in browser)
 * @param {Record<string, string>} [trackingParams] - Optional tracking parameters
 * @returns {string} The complete shareable URL
 *
 * @example
 * ```typescript
 * const shareUrl = generateShareableUrl('123e4567-e89b-12d3-a456-426614174000');
 * // Returns: "https://yourapp.com/polls/123e4567-e89b-12d3-a456-426614174000"
 *
 * const trackedUrl = generateShareableUrl('123', undefined, { source: 'email', campaign: 'newsletter' });
 * // Returns: "https://yourapp.com/polls/123?source=email&campaign=newsletter"
 * ```
 */
export function generateShareableUrl(
  pollId: string,
  baseUrl?: string,
  trackingParams?: Record<string, string>
): string {
  const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  const url = new URL(`/polls/${pollId}`, base);

  if (trackingParams) {
    Object.entries(trackingParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  return url.toString();
}

/**
 * Copies text to clipboard with fallback for older browsers
 *
 * @param {string} text - The text to copy to clipboard
 * @returns {Promise<boolean>} True if copy was successful, false otherwise
 *
 * @example
 * ```typescript
 * const success = await copyToClipboard('https://example.com');
 * if (success) {
 *   console.log('URL copied successfully!');
 * } else {
 *   console.log('Failed to copy URL');
 * }
 * ```
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      // Use the modern Clipboard API
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers or non-secure contexts
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const success = document.execCommand('copy');
      textArea.remove();
      return success;
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

/**
 * Generates social media share URLs for different platforms
 *
 * @param {string} url - The URL to share
 * @param {string} title - The title/text to include in the share
 * @param {string} platform - The social media platform ('twitter', 'facebook', 'linkedin', 'whatsapp')
 * @returns {string} The complete share URL for the specified platform
 *
 * @example
 * ```typescript
 * const twitterUrl = generateSocialShareUrl(
 *   'https://example.com/poll/123',
 *   'Check out this poll!',
 *   'twitter'
 * );
 * // Returns: "https://twitter.com/intent/tweet?url=https%3A//example.com/poll/123&text=Check%20out%20this%20poll%21"
 * ```
 */
export function generateSocialShareUrl(
  url: string,
  title: string,
  platform: 'twitter' | 'facebook' | 'linkedin' | 'whatsapp'
): string {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  switch (platform) {
    case 'twitter':
      return `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`;

    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;

    case 'linkedin':
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;

    case 'whatsapp':
      return `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`;

    default:
      return url;
  }
}
