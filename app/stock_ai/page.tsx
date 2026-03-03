'use client';

import { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AnalysisResult } from '@/types/analysis';
import { ResultView } from '@/components/ResultView';

const TIMEFRAME_OPTIONS = ['', '일봉', '4시간봉', '1시간봉', '30분봉', '15분봉', '기타'];

export default function StockAiPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragover, setDragover] = useState(false);
  const [symbol, setSymbol] = useState('');
  const [timeframe, setTimeframe] = useState('');
  const [useTwoStep, setUseTwoStep] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragover(false);
    const f = e.dataTransfer.files?.[0];
    if (f && f.type.startsWith('image/')) {
      setFile(f);
      setPreview(URL.createObjectURL(f));
      setResult(null);
      setError(null);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragover(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragover(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setPreview(URL.createObjectURL(f));
      setResult(null);
      setError(null);
    }
  }, []);

  const applyImageFile = useCallback((f: File) => {
    if (!f.type.startsWith('image/')) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setError(null);
  }, []);

  const handlePaste = useCallback((e: ClipboardEvent) => {
    if (!e.clipboardData?.items) return;
    for (const item of e.clipboardData.items) {
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const f = item.getAsFile();
        if (f) {
          e.preventDefault();
          applyImageFile(f);
          return;
        }
      }
    }
  }, [applyImageFile]);

  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  const analyze = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('image', file);
      if (symbol.trim()) formData.append('symbol', symbol.trim());
      if (timeframe.trim()) formData.append('timeframe', timeframe.trim());
      if (useTwoStep) formData.append('twoStep', 'true');
      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `서버 오류 (${res.status})`);
      }
      const data: AnalysisResult = await res.json();
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : '분석 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="border-b border-[var(--border)] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" className="text-[var(--muted)] hover:text-white text-sm">← 홈</Link>
          <span className="text-2xl font-bold gradient-text">Chart AI</span>
          <span className="text-xs text-[var(--muted)] uppercase tracking-wider">AI Analyzer</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-[var(--muted)]">
          <span>KR 한국어</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {!result ? (
          <>
            <h1 className="text-4xl font-bold gradient-text text-center mb-2">Chart AI</h1>
            <p className="text-center text-[var(--muted)] mb-10">
              주식, 코인 등 모든 차트를 분석하는 AI 솔루션
            </p>

            <div
              className={`upload-zone rounded-2xl p-12 text-center cursor-pointer ${dragover ? 'dragover' : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <input
                id="file-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileInput}
              />
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center">
                  <svg className="w-8 h-8 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-lg">차트 이미지 업로드</p>
                  <p className="text-sm text-[var(--muted)] mt-1">드래그 앤 드롭, 클릭하여 선택, 또는 <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-xs">Ctrl+V</kbd> 붙여넣기</p>
                </div>
                {preview && (
                  <div className="mt-4 flex flex-col items-center gap-4 w-full max-w-md mx-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                      <div>
                        <label className="block text-xs text-[var(--muted)] mb-1">종목/심볼 (선택)</label>
                        <input
                          type="text"
                          placeholder="예: BTCUSDT, 삼성전자"
                          value={symbol}
                          onChange={(e) => setSymbol(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-[var(--border)] text-sm text-white placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--accent)]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[var(--muted)] mb-1">타임프레임 (선택)</label>
                        <select
                          value={timeframe}
                          onChange={(e) => setTimeframe(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-[var(--border)] text-sm text-white focus:outline-none focus:border-[var(--accent)]"
                        >
                          {TIMEFRAME_OPTIONS.map((opt) => (
                            <option key={opt || 'empty'} value={opt} className="bg-[var(--card)]">
                              {opt || '선택 안 함'}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-[var(--muted)] cursor-pointer w-full" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={useTwoStep}
                        onChange={(e) => setUseTwoStep(e.target.checked)}
                        className="rounded border-[var(--border)] bg-white/5 text-[var(--accent)] focus:ring-[var(--accent)]"
                      />
                      <span>정확도 우선 (2단계 분석) — 시간·비용 약 2배</span>
                    </label>
                    <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black/40">
                      <Image src={preview} alt="차트 미리보기" fill className="object-contain" unoptimized />
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); analyze(); }}
                        disabled={loading}
                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-end)] text-white font-medium disabled:opacity-50"
                      >
                        {loading ? '분석 중...' : 'AI 분석하기'}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); reset(); }}
                        className="px-6 py-2.5 rounded-xl border border-[var(--border)] text-[var(--muted)] hover:text-white"
                      >
                        다시 선택
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <p className="mt-4 text-center text-red-400 text-sm">{error}</p>
            )}
          </>
        ) : (
          <ResultView
            chartImageUrl={preview!}
            result={result}
            onReset={reset}
          />
        )}
      </main>

      <footer className="border-t border-[var(--border)] px-6 py-4 text-center text-xs text-[var(--muted)]">
        AI 분석 결과는 참고용이며 투자 권유가 아닙니다. 투자 책임은 본인에게 있습니다.
      </footer>
    </div>
  );
}
