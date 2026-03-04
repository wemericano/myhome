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
  /** 관점 무효화 조건 (이 가격/조건이 되면 현재 의견 취소) */
  invalidationLevel?: string;
  /** 대안 시나리오 (반대 움직임 시 대응) */
  alternativeScenario?: string;
  /** 리스크 등급 (LOW/MEDIUM/HIGH) */
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  /** 변동성 평가 (구간·수준·ATR 관점 등) */
  volatilityAssessment?: string;
  /** 거래량 추세 (증가/감소/평균, 이탈 시 확인 여부) */
  volumeTrend?: string;
  /** 패턴 강도·신뢰도 (강함/보통/약함 또는 %) */
  patternStrength?: string;
  /** 포지션 크기 참고 (보수적 1~2% 등) */
  positionSizeHint?: string;
  /** 시장 환경 (추세장/횡보장/변동성 확대 등) */
  marketContext?: string;
}
