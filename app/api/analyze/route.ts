import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { AnalysisResult, Recommendation, TrendLine } from '@/types/analysis';

const SYSTEM_PROMPT = `You are a senior technical analyst (CTA/CFTe level) writing a concise professional report. Analyze the chart image (candlestick/OHLC) and return ONLY a JSON object. Use Korean. All numbers must be numeric (no quotes). Use exact keys.

Analysis rules:
- Identify trend (상승/하락/횡보), strength, and structure (고점·저점, 추세선, 채널).
- Mark clear support/resistance from visible swing points; keyPriceLevels = 4–6 major levels with short labels (e.g. "이전 고점", "거래량 집중 구간").
- Infer timeframe from axis (봉 수, 기간) and state in "timeframe" (e.g. "일봉", "4시간봉").
- Comment on volume: breakout confirmation, divergence, climax in "volumeAnalysis".
- Comment on momentum (RSI 과매수/과매도, MACD 크로스, 이격도 등) in "momentum".
- Name chart patterns if visible: 헤드앤숄더, 이중천정/이중바닥, 삼각수렴, 플래그, 채널 등 in patternRecognition.
- Set entryPrice, stopLoss, takeProfit from structure; riskRewardRatio and riskPercent/rewardPercent must be consistent.
- Write summary, trendAnalysis, patternRecognition, technicalIndicators, tradingStrategy in professional, report-style Korean (2–4 sentences each). No fluff.

JSON shape (return only this object, no markdown):
{
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
  "volumeAnalysis": "string (거래량·수급 요약)",
  "momentum": "string (모멘텀·강도 요약)",
  "timeframe": "string (추정 타임프레임)"
}

Infer price scale from axis for chartBounds. Respond with ONLY the JSON object: no markdown, no backticks, no text before or after.`;

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

  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  const mime = file.type || 'image/png';

  const openai = new OpenAI({ apiKey });

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 2000,
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: '위 규칙에 따라 차트를 전문가 수준으로 기술적 분석한 뒤, 지정된 JSON 형식만 반환하세요. 다른 텍스트 없이 JSON 객체만 출력하세요.',
            },
            {
              type: 'image_url',
              image_url: { url: `data:${mime};base64,${base64}` },
            },
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
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error('Analyze API error:', err);
    const message = err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
