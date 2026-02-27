import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'My Home | WeVeloper',
  description: 'Hello My World - WeVeloper',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
