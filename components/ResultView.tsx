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
      <div className="flex items-center justify-between text-xs text-[var(--muted)] uppercase tracking-wider mb-1">
        <span>Technical Analysis Report</span>
        {result.timeframe && <span>추정 타임프레임: {result.timeframe}</span>}
      </div>

      <div className={`${recColors[result.recommendation]} rounded-xl px-6 py-4 flex items-center justify-between flex-wrap gap-2`}>
        <span className="font-bold text-lg uppercase tracking-wide">
          RECOMMENDATION {result.recommendation}
        </span>
        <span className="font-semibold">CONFIDENCE {result.confidence}%</span>
      </div>

      {result.headline && (
        <section className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-4">
          <p className="text-xs text-[var(--muted)] mb-1.5 font-semibold uppercase tracking-wide">핵심 의견</p>
          <p className="text-base font-medium leading-relaxed text-[var(--text)]">{result.headline}</p>
        </section>
      )}

      {(result.convictionReasoning || result.keyRisks) && (
        <section className="grid md:grid-cols-2 gap-4">
          {result.convictionReasoning && (
            <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-4">
              <p className="text-xs text-[var(--muted)] mb-1.5 font-semibold uppercase tracking-wide">확신 근거</p>
              <p className="text-sm leading-relaxed">{result.convictionReasoning}</p>
            </div>
          )}
          {result.keyRisks && (
            <div className="rounded-xl bg-[var(--card)] border border-amber-500/30 p-4">
              <p className="text-xs text-amber-400/90 mb-1.5 font-semibold uppercase tracking-wide">리스크 요약</p>
              <p className="text-sm leading-relaxed">{result.keyRisks}</p>
            </div>
          )}
        </section>
      )}

      {(result.invalidationLevel || result.alternativeScenario) && (
        <section className="grid md:grid-cols-2 gap-4">
          {result.invalidationLevel && (
            <div className="rounded-xl bg-[var(--card)] border border-red-500/30 p-4">
              <p className="text-xs text-red-400/90 mb-1.5 font-semibold uppercase tracking-wide">관점 무효화 조건</p>
              <p className="text-sm leading-relaxed">{result.invalidationLevel}</p>
            </div>
          )}
          {result.alternativeScenario && (
            <div className="rounded-xl bg-[var(--card)] border border-sky-500/30 p-4">
              <p className="text-xs text-sky-400/90 mb-1.5 font-semibold uppercase tracking-wide">대안 시나리오</p>
              <p className="text-sm leading-relaxed">{result.alternativeScenario}</p>
            </div>
          )}
        </section>
      )}

      {(result.riskLevel || result.volatilityAssessment || result.volumeTrend || result.patternStrength || result.positionSizeHint || result.marketContext) && (
        <section className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-4">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">전문 데이터</h2>
            {result.riskLevel && (
              <span
                className={`px-2 py-0.5 rounded text-xs font-semibold ${
                  result.riskLevel === 'LOW' ? 'bg-emerald-500/20 text-emerald-400' :
                  result.riskLevel === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-red-500/20 text-red-400'
                }`}
              >
                RISK {result.riskLevel}
              </span>
            )}
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
            {result.volatilityAssessment && (
              <div>
                <p className="text-xs text-[var(--muted)] mb-0.5">변동성</p>
                <p className="leading-relaxed">{result.volatilityAssessment}</p>
              </div>
            )}
            {result.volumeTrend && (
              <div>
                <p className="text-xs text-[var(--muted)] mb-0.5">거래량 추세</p>
                <p className="leading-relaxed">{result.volumeTrend}</p>
              </div>
            )}
            {result.patternStrength && (
              <div>
                <p className="text-xs text-[var(--muted)] mb-0.5">패턴 강도</p>
                <p className="leading-relaxed">{result.patternStrength}</p>
              </div>
            )}
            {result.positionSizeHint && (
              <div>
                <p className="text-xs text-[var(--muted)] mb-0.5">포지션 참고</p>
                <p className="leading-relaxed">{result.positionSizeHint}</p>
              </div>
            )}
            {result.marketContext && (
              <div>
                <p className="text-xs text-[var(--muted)] mb-0.5">시장 환경</p>
                <p className="leading-relaxed">{result.marketContext}</p>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="rounded-xl border border-[var(--border)] overflow-hidden bg-[var(--card)]">
        <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-lg font-semibold">시각적 분석 · 기술적 구간</h2>
            <p className="text-xs text-[var(--muted)] mt-0.5">차트 위 지지·저항·추세선 및 진입·손절·익절 구간</p>
          </div>
          <button
            type="button"
            onClick={onReset}
            className="text-sm text-[var(--muted)] hover:text-white"
          >
            새 차트 분석
          </button>
        </div>
        {result.summary && (
          <div className="px-4 py-2 bg-white/[0.02] border-b border-[var(--border)]">
            <p className="text-xs text-[var(--muted)] mb-0.5">차트 해석 요약</p>
            <p className="text-sm leading-relaxed">{result.summary}</p>
          </div>
        )}
        <div
          ref={containerRef}
          className="relative w-full aspect-[2/1] max-h-[480px] bg-[#1a1a1f]"
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
              {/* 저항선 */}
              {result.resistances.map((r) => (
                <div
                  key={`r-${r.price}`}
                  className="absolute left-0 right-0 border-t-2 border-blue-500"
                  style={{ top: `${100 - priceToY(r.price)}%` }}
                >
                  <span className="absolute left-0 -top-6 text-xs font-medium text-blue-400 whitespace-nowrap bg-[#1a1a1f]/90 px-1 rounded">
                    저항 {r.label}
                  </span>
                </div>
              ))}
              {/* 지지선 */}
              {result.supports.map((s) => (
                <div
                  key={`s-${s.price}`}
                  className="absolute left-0 right-0 border-t-2 border-red-500"
                  style={{ top: `${100 - priceToY(s.price)}%` }}
                >
                  <span className="absolute left-0 -top-6 text-xs font-medium text-red-400 whitespace-nowrap bg-[#1a1a1f]/90 px-1 rounded">
                    지지 {s.label}
                  </span>
                </div>
              ))}
              {/* 진입가 */}
              {result.entryPrice > 0 && result.entryPrice >= result.chartBounds.priceMin && result.entryPrice <= result.chartBounds.priceMax && (
                <div
                  className="absolute left-0 right-0 border-t-2 border-sky-400 border-dashed"
                  style={{ top: `${100 - priceToY(result.entryPrice)}%` }}
                >
                  <span className="absolute right-0 -top-6 text-xs font-medium text-sky-400 whitespace-nowrap bg-[#1a1a1f]/90 px-1 rounded">
                    진입 {result.entryPrice.toLocaleString()}
                  </span>
                </div>
              )}
              {/* 손절가 */}
              {result.stopLoss > 0 && result.stopLoss >= result.chartBounds.priceMin && result.stopLoss <= result.chartBounds.priceMax && (
                <div
                  className="absolute left-0 right-0 border-t-2 border-red-400 border-dashed"
                  style={{ top: `${100 - priceToY(result.stopLoss)}%` }}
                >
                  <span className="absolute right-0 -top-6 text-xs font-medium text-red-400 whitespace-nowrap bg-[#1a1a1f]/90 px-1 rounded">
                    손절 {result.stopLoss.toLocaleString()}
                  </span>
                </div>
              )}
              {/* 익절가 */}
              {result.takeProfit > 0 && result.takeProfit >= result.chartBounds.priceMin && result.takeProfit <= result.chartBounds.priceMax && (
                <div
                  className="absolute left-0 right-0 border-t-2 border-emerald-400 border-dashed"
                  style={{ top: `${100 - priceToY(result.takeProfit)}%` }}
                >
                  <span className="absolute right-0 -top-6 text-xs font-medium text-emerald-400 whitespace-nowrap bg-[#1a1a1f]/90 px-1 rounded">
                    익절 {result.takeProfit.toLocaleString()}
                  </span>
                </div>
              )}
              {/* 추세선 */}
              {result.trendLine && (
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <line
                    x1={result.trendLine.startPercent ?? 0}
                    y1={100 - priceToY(result.trendLine.startPrice)}
                    x2={result.trendLine.endPercent ?? 100}
                    y2={100 - priceToY(result.trendLine.endPrice)}
                    stroke="#8b5cf6"
                    strokeWidth="0.8"
                    strokeDasharray="4 2"
                  />
                </svg>
              )}
            </div>
          )}
        </div>
        <div className="px-4 py-3 border-t border-[var(--border)] flex flex-wrap gap-4 text-xs text-[var(--muted)]">
          <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-blue-500 rounded" />저항</span>
          <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-red-500 rounded" />지지</span>
          <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 border-t-2 border-dashed border-sky-400 rounded" />진입</span>
          <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 border-t-2 border-dashed border-red-400 rounded" />손절</span>
          <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 border-t-2 border-dashed border-emerald-400 rounded" />익절</span>
          {result.trendLine && <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-[#8b5cf6] rounded" style={{ borderStyle: 'dashed' }} />추세선</span>}
        </div>
      </section>

      <section className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-4">
        <h3 className="text-sm font-semibold text-[var(--muted)] mb-1">주요 가격대</h3>
        <p className="text-xs text-[var(--muted)] mb-3">기술적 지지·저항 및 핵심 구간</p>
        <div className="flex flex-wrap gap-2">
          {result.keyPriceLevels.map((level) => (
            <span
              key={level.price}
              className="px-3 py-1.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-sm"
            >
              <strong>{level.price.toLocaleString()}</strong> <span className="text-[var(--muted)]">{level.label}</span>
            </span>
          ))}
        </div>
      </section>

      <section className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-4">
        <h3 className="text-sm font-semibold text-[var(--muted)] mb-1">진입 · 손절 · 익절</h3>
        <p className="text-xs text-[var(--muted)] mb-3">시각적 분석 차트에 표시된 구간과 동일</p>
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg bg-[var(--bg)] border border-sky-500/40 p-4">
            <p className="text-xs text-sky-400 mb-1">진입가</p>
            <p className="text-xl font-bold">{result.entryPrice.toLocaleString()}</p>
            <p className="text-xs text-[var(--muted)] mt-1">Risk/Reward {result.riskRewardRatio}</p>
          </div>
          <div className="rounded-lg bg-[var(--bg)] border border-red-500/40 p-4">
            <p className="text-xs text-red-400 mb-1">손절가</p>
            <p className="text-xl font-bold">{result.stopLoss.toLocaleString()}</p>
            <p className="text-xs text-red-400 mt-1">Risk {result.riskPercent}%</p>
          </div>
          <div className="rounded-lg bg-[var(--bg)] border border-emerald-500/40 p-4">
            <p className="text-xs text-emerald-400 mb-1">익절가</p>
            <p className="text-xl font-bold">{result.takeProfit.toLocaleString()}</p>
            <p className="text-xs text-emerald-400 mt-1">Reward +{result.rewardPercent}%</p>
          </div>
        </div>
      </section>

      <section className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-4">
        <h3 className="text-sm font-semibold text-[var(--muted)] mb-1">상세 분석</h3>
        <p className="text-xs text-[var(--muted)] mb-3">추세·패턴·지표 및 거래량·모멘텀</p>
        <div className="space-y-4">
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

      <section className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-4">
        <h3 className="text-sm font-semibold text-[var(--muted)] mb-1">매매 전략</h3>
        <p className="text-xs text-[var(--muted)] mb-3">실전 적용 시 참고할 구체적 행동 지침</p>
        <div className="rounded-lg bg-[var(--bg)] border border-[var(--border)] p-4">
          <p className="text-sm leading-relaxed whitespace-pre-line">{result.tradingStrategy}</p>
        </div>
      </section>

      <div className="border-t border-[var(--border)] pt-4 mt-6">
        <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider mb-1">면책조항</p>
        <p className="text-xs text-[var(--muted)] leading-relaxed">
          본 보고서는 기술적 분석 참고용이며 투자 권유·청약이 아닙니다. 투자 결정 및 손익에 대한 책임은 투자자 본인에게 있습니다.
        </p>
      </div>
    </div>
  );
}
