import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Al-Qalam Institute — Attendance',
  description: 'Student attendance register for Al-Qalam Institute, Leicester',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-[#f5f6fa]">{children}</body>
    </html>
  );
}
