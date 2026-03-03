import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { AnalysisResult, Recommendation, TrendLine } from '@/types/analysis';

const SYSTEM_PROMPT = `You are a senior technical analyst at an institutional research desk (CTA/CFTe, 15+ years experience). You are writing a one-page Technical Analysis Report for internal/client use. Tone: concise, decisive, institutional. Use precise terminology (지지·저항, 추세선 이탈, 거래량 확인, RSI/MACD, 패턴 완성·실패, 이격, 고점·저점). Write in Korean. All numbers numeric (no quotes). Use exact keys only.

Report structure (all required):
1. headline: One sentence conclusion + action (e.g. "상승 추세선 유지 구간, 지지 부근 매수·저항 목표." / "이중 천정 의심, 관망·이탈 시 숏 검토.").
2. convictionReasoning: WHY this view (구조·패턴·지표 근거) 1–2 sentences.
3. keyRisks: Main risks 1–2 sentences (e.g. 지지 이탈, 거래량 미확인 이탈).
4. invalidationLevel: Concrete price or condition that INVALIDATES this view (e.g. "종가 기준 OOO원 이탈 시 매수 관점 포기"). 반드시 구체적 가격 또는 조건.
5. alternativeScenario: If price moves against the view, what to do. 대안 시나리오 1문장.
6. For VISUAL overlay (시각적 분석): chartBounds must EXACTLY match the chart Y-axis range (priceMin, priceMax from the visible scale). resistances and supports: provide 2–3 each with exact prices from the chart (swing highs/lows) and short labels so they can be drawn on the chart. trendLine: if you draw a trend line, set startPercent/endPercent (0–100) for left-to-right position and startPrice/endPrice from chart scale. entryPrice, stopLoss, takeProfit must be in the same scale (never 0) so they appear on the chart.
7. summary: 2–3 sentences that also work as "차트 해석 요약". trendAnalysis, patternRecognition, technicalIndicators, tradingStrategy: 2–4 sentences each, never empty. keyPriceLevels 4–6 with labels. timeframe, volumeAnalysis, momentum: never empty.
8. Professional metrics (fill all): riskLevel "LOW"|"MEDIUM"|"HIGH" (이 관점의 리스크 등급). volatilityAssessment: 변동성 수준·구간 평가 1문장. volumeTrend: 거래량 추세(증가/감소/평균) 및 이탈 시 거래량 확인 여부 1문장. patternStrength: 현재 패턴의 강도·신뢰도 1문장. positionSizeHint: 포지션 크기 참고(예 "보수적 1~2%", "표준 2~3%") 1문장. marketContext: 시장 환경(추세장/횡보장/변동성 확대 등) 1문장.

Accuracy checklist (verify before returning): (1) chartBounds.priceMin and priceMax exactly match the visible Y-axis scale. (2) Every price (resistances, supports, entryPrice, stopLoss, takeProfit, keyPriceLevels) must lie within [priceMin, priceMax]. (3) Typically resistances > supports; for BUY usually entry > stopLoss and entry < takeProfit; for SELL usually entry < stopLoss and entry > takeProfit. (4) Read axis labels and numbers carefully; do not guess.

JSON shape (return only this object, no markdown):
{
  "headline": "string",
  "convictionReasoning": "string",
  "keyRisks": "string",
  "invalidationLevel": "string (관점 무효화 가격/조건)",
  "alternativeScenario": "string (대안 시나리오)",
  "recommendation": "BUY" | "SELL" | "HOLD",
  "confidence": number 1-100,
  "chartBounds": { "priceMin": number, "priceMax": number },
  "resistances": [ { "price": number, "label": "string" } ],
  "supports": [ { "price": number, "label": "string" } ],
  "trendLine": { "type": "string", "label": "string", "startPrice": number, "endPrice": number, "startPercent": number 0-100, "endPercent": number 0-100 } or null,
  "currentPrice": { "price": number, "changePercent": number, "date": "string" } or null,
  "keyPriceLevels": [ { "price": number, "label": "string" } ],
  "entryPrice": number,
  "stopLoss": number,
  "takeProfit": number,
  "riskRewardRatio": "string e.g. 1:1.65",
  "riskPercent": number (negative),
  "rewardPercent": number (positive),
  "summary": "string",
  "trendAnalysis": "string",
  "patternRecognition": "string",
  "technicalIndicators": "string",
  "tradingStrategy": "string",
  "volumeAnalysis": "string",
  "momentum": "string",
  "timeframe": "string",
  "riskLevel": "LOW" | "MEDIUM" | "HIGH",
  "volatilityAssessment": "string",
  "volumeTrend": "string",
  "patternStrength": "string",
  "positionSizeHint": "string",
  "marketContext": "string"
}

Respond with ONLY the JSON object: no markdown, no backticks, no text before or after.`;

/** 마크다운/설명 제거 후 JSON 객체만 추출 (중괄호 균형 맞춤) */
function extractJson(raw: string): string {
  let s = raw.trim();
  // ```json ... ``` 또는 ``` ... ``` 제거
  const codeBlock = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) s = codeBlock[1].trim();
  // 첫 번째 { 위치
  const start = s.indexOf('{');
  if (start === -1) return '{}';
  let depth = 0;
  let inString = false;
  let escape = false;
  let quote = '';
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (c === '\\' && inString) {
      escape = true;
      continue;
    }
    if (!inString) {
      if (c === '"' || c === "'") {
        inString = true;
        quote = c;
        continue;
      }
      if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) return s.slice(start, i + 1);
      }
      continue;
    }
    if (c === quote) inString = false;
  }
  // 균형 안 맞으면 기존 방식으로 fallback
  const fallback = s.slice(start).match(/\{[\s\S]*\}/);
  return fallback ? fallback[0] : s.slice(start);
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY가 설정되지 않았습니다. .env.local에 추가해 주세요.' },
      { status: 500 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: '요청 본문을 읽을 수 없습니다.' }, { status: 400 });
  }

  const file = formData.get('image');
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: '이미지 파일을 업로드해 주세요.' }, { status: 400 });
  }

  const symbol = (formData.get('symbol') as string)?.trim() || '';
  const timeframeInput = (formData.get('timeframe') as string)?.trim() || '';
  const useTwoStep = formData.get('twoStep') === 'true';

  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  const mime = file.type || 'image/png';

  const openai = new OpenAI({ apiKey });

  const imagePart = { type: 'image_url' as const, image_url: { url: `data:${mime};base64,${base64}`, detail: 'high' as const } };

  const parts: string[] = [];
  if (symbol) parts.push(`종목/심볼: ${symbol}`);
  if (timeframeInput) parts.push(`타임프레임: ${timeframeInput}`);
  const userContext = parts.length ? `\n\n참고: 사용자 입력 - ${parts.join(', ')}. 이에 맞춰 분석하세요.` : '';

  try {
    let observationJson: string | null = null;

    if (useTwoStep) {
      const step1Prompt = `Look at this chart image. Return ONLY a JSON object with these exact keys (read numbers from the Y-axis and chart):
- chartBounds: { "priceMin": number, "priceMax": number } (exact Y-axis range visible)
- resistances: [ { "price": number, "label": "string" } ] (2-3 swing highs, use Korean short labels)
- supports: [ { "price": number, "label": "string" } ] (2-3 swing lows)
- currentPriceApprox: number (price level near the last candle)

All numbers must be within chartBounds. No other text. JSON only.`;
      const step1 = await openai.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 800,
        temperature: 0.1,
        response_format: { type: 'json_object' as const },
        messages: [
          { role: 'system', content: 'You extract exact numerical data from chart images. Return only valid JSON.' },
          { role: 'user', content: [{ type: 'text', text: step1Prompt }, imagePart] },
        ],
      });
      const raw1 = step1.choices[0]?.message?.content?.trim();
      if (raw1) observationJson = extractJson(raw1);
    }

    const mainUserText =
      (observationJson
        ? `[1차 관측 데이터 - 반드시 사용]\n${observationJson}\n\n위 관측 데이터의 chartBounds, resistances, supports를 그대로 사용하고 currentPriceApprox를 참고하여, 아래 지시에 따라 전체 리포트 JSON을 작성하세요. `
        : '') +
      `위 리포트 구조와 Accuracy checklist를 지키며 차트를 분석해 JSON만 반환하세요. Y축 숫자를 정확히 읽어 chartBounds 및 모든 가격을 넣고, headline·convictionReasoning·keyRisks·invalidationLevel·alternativeScenario를 반드시 채우세요. 진입가·손절가·익절가는 0이 아닌 차트 범위 내 숫자로 넣으세요.${userContext}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 4000,
      temperature: 0.2,
      response_format: { type: 'json_object' as const },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: mainUserText },
            imagePart,
          ],
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim();
    if (!raw) {
      return NextResponse.json({ error: 'AI가 응답을 생성하지 못했습니다.' }, { status: 502 });
    }

    const jsonStr = extractJson(raw);
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      // trailing comma 등 흔한 오류 보정 후 재시도
      const fixed = jsonStr
        .replace(/,\s*([}\]])/g, '$1')
        .replace(/([{[])\s*,/g, '$1');
      try {
        parsed = JSON.parse(fixed);
      } catch {
        console.error('Analyze parse failed. Raw (first 500):', raw.slice(0, 500));
        return NextResponse.json(
          { error: 'AI 응답을 파싱할 수 없습니다. 다시 시도해 주세요.' },
          { status: 502 }
        );
      }
    }

    const r = parsed as Record<string, unknown>;
    const result: AnalysisResult = {
      recommendation: (r.recommendation as Recommendation) || 'HOLD',
      confidence: Number(r.confidence) || 50,
      chartBounds: (r.chartBounds as { priceMin: number; priceMax: number }) || { priceMin: 0, priceMax: 100 },
      resistances: Array.isArray(r.resistances) ? r.resistances as { price: number; label: string }[] : [],
      supports: Array.isArray(r.supports) ? r.supports as { price: number; label: string }[] : [],
      trendLine: (r.trendLine as TrendLine | null) ?? null,
      currentPrice: (r.currentPrice as { price: number; changePercent: number; date: string } | null) ?? null,
      keyPriceLevels: Array.isArray(r.keyPriceLevels) ? r.keyPriceLevels as { price: number; label: string }[] : [],
      entryPrice: Number(r.entryPrice) || 0,
      stopLoss: Number(r.stopLoss) || 0,
      takeProfit: Number(r.takeProfit) || 0,
      riskRewardRatio: String(r.riskRewardRatio || '1:1'),
      riskPercent: Number(r.riskPercent) || 0,
      rewardPercent: Number(r.rewardPercent) || 0,
      summary: String(r.summary || ''),
      trendAnalysis: String(r.trendAnalysis || ''),
      patternRecognition: String(r.patternRecognition || ''),
      technicalIndicators: String(r.technicalIndicators || ''),
      tradingStrategy: String(r.tradingStrategy || ''),
      volumeAnalysis: r.volumeAnalysis != null ? String(r.volumeAnalysis) : undefined,
      momentum: r.momentum != null ? String(r.momentum) : undefined,
      timeframe: r.timeframe != null ? String(r.timeframe) : undefined,
      headline: r.headline != null ? String(r.headline) : undefined,
      keyRisks: r.keyRisks != null ? String(r.keyRisks) : undefined,
      convictionReasoning: r.convictionReasoning != null ? String(r.convictionReasoning) : undefined,
      invalidationLevel: r.invalidationLevel != null ? String(r.invalidationLevel) : undefined,
      alternativeScenario: r.alternativeScenario != null ? String(r.alternativeScenario) : undefined,
      riskLevel: ['LOW', 'MEDIUM', 'HIGH'].includes(String(r.riskLevel)) ? r.riskLevel as 'LOW' | 'MEDIUM' | 'HIGH' : undefined,
      volatilityAssessment: r.volatilityAssessment != null ? String(r.volatilityAssessment) : undefined,
      volumeTrend: r.volumeTrend != null ? String(r.volumeTrend) : undefined,
      patternStrength: r.patternStrength != null ? String(r.patternStrength) : undefined,
      positionSizeHint: r.positionSizeHint != null ? String(r.positionSizeHint) : undefined,
      marketContext: r.marketContext != null ? String(r.marketContext) : undefined,
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error('Analyze API error:', err);
    const message = err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
