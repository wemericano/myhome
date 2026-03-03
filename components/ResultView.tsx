'use client';

import { useRef, useEffect, useState } from 'react';
import Image from 'next/image';
import type { AnalysisResult, Recommendation } from '@/types/analysis';

interface ResultViewProps {
  chartImageUrl: string;
  result: AnalysisResult;
  onReset: () => void;
}

const recColors: Record<Recommendation, string> = {
  BUY: 'bg-emerald-600',
  SELL: 'bg-red-600',
  HOLD: 'bg-amber-600',
};

export function ResultView({ chartImageUrl, result, onReset }: ResultViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [chartRect, setChartRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setChartRect(el.getBoundingClientRect()));
    ro.observe(el);
    setChartRect(el.getBoundingClientRect());
    return () => ro.disconnect();
  }, [chartImageUrl]);

  const priceToY = (price: number) => {
    if (!chartRect || !result.chartBounds) return 0;
    const { priceMin, priceMax } = result.chartBounds;
    const range = priceMax - priceMin || 1;
    const p = (price - priceMin) / range;
    return p * 100;
  };

  return (
    <div className="space-y-6">
      <div className={`${recColors[result.recommendation]} rounded-xl px-6 py-4 flex items-center justify-between flex-wrap gap-2`}>
        <span className="font-bold text-lg uppercase tracking-wide">
          RECOMMENDATION {result.recommendation}
        </span>
        <div className="flex items-center gap-4">
          {result.timeframe && (
            <span className="text-sm opacity-90">추정 {result.timeframe}</span>
          )}
          <span className="font-semibold">CONFIDENCE {result.confidence}%</span>
        </div>
      </div>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">시각적 분석</h2>
          <button
            type="button"
            onClick={onReset}
            className="text-sm text-[var(--muted)] hover:text-white"
          >
            새 차트 분석
          </button>
        </div>
        <div
          ref={containerRef}
          className="relative w-full aspect-[2/1] max-h-[480px] rounded-xl overflow-hidden bg-[#1a1a1f]"
        >
          <Image
            src={chartImageUrl}
            alt="분석된 차트"
            fill
            className="object-contain"
            unoptimized
            priority
          />
          {chartRect && result.chartBounds && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ margin: '8% 12% 15% 8%' }}
            >
              {result.resistances.map((r) => (
                <div
                  key={r.price}
                  className="absolute left-0 right-0 border-t-2 border-blue-500"
                  style={{ top: `${100 - priceToY(r.price)}%` }}
                >
                  <span className="absolute left-0 -top-6 text-xs text-blue-400 whitespace-nowrap">
                    {r.label}
                  </span>
                </div>
              ))}
              {result.supports.map((s) => (
                <div
                  key={s.price}
                  className="absolute left-0 right-0 border-t-2 border-red-500"
                  style={{ top: `${100 - priceToY(s.price)}%` }}
                >
                  <span className="absolute left-0 -top-6 text-xs text-red-400 whitespace-nowrap">
                    {s.label}
                  </span>
                </div>
              ))}
              {result.trendLine && (
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <line
                    x1={result.trendLine.startPercent ?? 0}
                    y1={100 - priceToY(result.trendLine.startPrice)}
                    x2={result.trendLine.endPercent ?? 100}
                    y2={100 - priceToY(result.trendLine.endPrice)}
                    stroke="#8b5cf6"
                    strokeWidth="0.5"
                    strokeDasharray="2 2"
                  />
                </svg>
              )}
            </div>
          )}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-[var(--muted)] mb-3">주요 가격대</h3>
        <div className="flex flex-wrap gap-2">
          {result.keyPriceLevels.map((level) => (
            <span
              key={level.price}
              className="px-3 py-1.5 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm"
            >
              <strong>{level.price.toLocaleString()}</strong> {level.label}
            </span>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-3 gap-4">
        <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-4">
          <p className="text-xs text-[var(--muted)] mb-1">진입가</p>
          <p className="text-xl font-bold">{result.entryPrice.toLocaleString()}</p>
          <p className="text-xs text-sky-400 mt-1">Risk/Reward {result.riskRewardRatio}</p>
        </div>
        <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-4 border-red-500/50">
          <p className="text-xs text-red-400 mb-1">손절가</p>
          <p className="text-xl font-bold">{result.stopLoss.toLocaleString()}</p>
          <p className="text-xs text-red-400 mt-1">Risk {result.riskPercent}%</p>
        </div>
        <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-4 border-emerald-500/50">
          <p className="text-xs text-emerald-400 mb-1">익절가</p>
          <p className="text-xl font-bold">{result.takeProfit.toLocaleString()}</p>
          <p className="text-xs text-emerald-400 mt-1">Reward +{result.rewardPercent}%</p>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-[var(--muted)] mb-3">상세 분석</h3>
        <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-4 space-y-4">
          <div>
            <p className="text-xs text-[var(--muted)] mb-1">요약</p>
            <p className="text-sm leading-relaxed">{result.summary}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-[var(--muted)] mb-1">추세 분석</p>
              <p className="text-sm leading-relaxed">{result.trendAnalysis}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--muted)] mb-1">패턴 인식</p>
              <p className="text-sm leading-relaxed">{result.patternRecognition}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--muted)] mb-1">기술적 지표</p>
              <p className="text-sm leading-relaxed">{result.technicalIndicators}</p>
            </div>
          </div>
          {(result.volumeAnalysis || result.momentum) && (
            <div className="grid md:grid-cols-2 gap-4 pt-2 border-t border-[var(--border)] mt-4">
              {result.volumeAnalysis && (
                <div>
                  <p className="text-xs text-[var(--muted)] mb-1">거래량·수급</p>
                  <p className="text-sm leading-relaxed">{result.volumeAnalysis}</p>
                </div>
              )}
              {result.momentum && (
                <div>
                  <p className="text-xs text-[var(--muted)] mb-1">모멘텀</p>
                  <p className="text-sm leading-relaxed">{result.momentum}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-[var(--muted)] mb-3">매매 전략</h3>
        <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-4">
          <p className="text-sm leading-relaxed whitespace-pre-line">{result.tradingStrategy}</p>
        </div>
      </section>

      <p className="text-xs text-[var(--muted)] text-center pt-4">
        ▲ AI 분석 결과는 참고용이며 투자 권유가 아닙니다. 투자 책임은 본인에게 있습니다.
      </p>
    </div>
  );
}
