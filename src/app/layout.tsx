import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ALX Polly",
  description: "Create and share polls with real-time results",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <nav className="border-b bg-background">
          <div className="container mx-auto px-4 py-3">
            <div className="flex justify-between items-center">
              <Link href="/" className="text-xl font-bold">
                ALX Polly
              </Link>
              <div className="flex space-x-4">
                <Link href="/polls" className="hover:underline">
                  My Polls
                </Link>
                <Link href="/polls/new" className="hover:underline">
                  Create Poll
                </Link>
                <Link href="/auth/login" className="hover:underline">
                  Login
                </Link>
                <Link href="/auth/register" className="hover:underline">
                  Register
                </Link>
              </div>
            </div>
          </div>
        </nav>
        <main className="min-h-screen bg-background">
          {children}
        </main>
      </body>
    </html>
  );
}
