import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// TODO: Add utilities like QR code generation
export function generateQRCode(url: string) {
  // Placeholder; integrate qrcode library later
  return url;
}
