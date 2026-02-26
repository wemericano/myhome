import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Chart AI | 차트 AI 분석',
  description: '주식, 코인 등 차트 이미지를 업로드하면 AI가 기술적 분석을 해드립니다.',
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
