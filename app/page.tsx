import Link from 'next/link';

export default function Home() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: '#0f172a', color: '#e5e7eb' }}
    >
      <div className="text-center">
        <h1 className="text-[42px] mb-3">🚀 Hello My World 🚀</h1>
        <p className="opacity-80 text-base">- WeVeloper -</p>
        <div className="flex gap-5 mt-10 justify-center flex-wrap">
          <Link
            href="/portfolio.html"
            className="inline-block px-8 py-3.5 text-base font-semibold rounded-xl border-0 cursor-pointer transition-all duration-300 no-underline text-white"
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
              boxShadow: '0 10px 30px rgba(59, 130, 246, 0.3)',
            }}
          >
            포트폴리오
          </Link>
          <Link
            href="/stock_ai"
            className="inline-block px-8 py-3.5 text-base font-semibold rounded-xl border-0 cursor-pointer transition-all duration-300 no-underline text-white hover:-translate-y-0.5"
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
              boxShadow: '0 10px 30px rgba(59, 130, 246, 0.3)',
            }}
          >
            AI Stock Predictor
          </Link>
        </div>
      </div>
    </div>
  );
}
