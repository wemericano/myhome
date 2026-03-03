export type Recommendation = 'BUY' | 'SELL' | 'HOLD';

export interface PriceLevel {
  price: number;
  label: string;
}

export interface TrendLine {
  type: string;
  label: string;
  startPrice: number;
  endPrice: number;
  startPercent?: number;
  endPercent?: number;
}

export interface AnalysisResult {
  recommendation: Recommendation;
  confidence: number;
  chartBounds: { priceMin: number; priceMax: number };
  resistances: PriceLevel[];
  supports: PriceLevel[];
  trendLine?: TrendLine | null;
  currentPrice?: { price: number; changePercent: number; date: string } | null;
  keyPriceLevels: PriceLevel[];
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  riskRewardRatio: string;
  riskPercent: number;
  rewardPercent: number;
  summary: string;
  trendAnalysis: string;
  patternRecognition: string;
  technicalIndicators: string;
  tradingStrategy: string;
  /** 거래량·수급 관점 (선택) */
  volumeAnalysis?: string;
  /** 모멘텀·강도 (선택) */
  momentum?: string;
  /** 추정 타임프레임 (선택) */
  timeframe?: string;
  /** 한 줄 핵심 의견 (리포트 헤드라인) */
  headline?: string;
  /** 리스크 요약 (1~2문장) */
  keyRisks?: string;
  /** 확신 근거 (이 의견을 내는 이유) */
  convictionReasoning?: string;
}
