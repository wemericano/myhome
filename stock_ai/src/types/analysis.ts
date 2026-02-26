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
}
