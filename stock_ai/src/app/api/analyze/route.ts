import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { AnalysisResult, Recommendation } from '@/types/analysis';

const SYSTEM_PROMPT = `You are a technical analysis expert for stock/crypto charts. Given a chart image (candlestick or OHLC), analyze it and return a JSON object with the following structure. Use Korean for all text labels and analysis. All numeric values must be numbers (no quotes). Use the exact keys below.

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
  "summary": "2-3 sentences in Korean",
  "trendAnalysis": "2-3 sentences in Korean",
  "patternRecognition": "2-3 sentences in Korean",
  "technicalIndicators": "2-3 sentences in Korean",
  "tradingStrategy": "2-4 sentences in Korean, actionable advice"
}

Infer price scale from the chart (e.g. if axis shows 2000-26000, use those for chartBounds). Draw 1-2 resistance levels, 1-2 support levels. keyPriceLevels should list 4-6 important levels with short Korean descriptions. Return only valid JSON, no markdown.`;

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
              text: '이 차트 이미지를 분석하고 위 형식의 JSON만 반환하세요. 다른 설명 없이 JSON만 출력하세요.',
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

    let parsed: unknown;
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : raw;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json(
        { error: 'AI 응답을 파싱할 수 없습니다. 다시 시도해 주세요.' },
        { status: 502 }
      );
    }

    const r = parsed as Record<string, unknown>;
    const result: AnalysisResult = {
      recommendation: (r.recommendation as Recommendation) || 'HOLD',
      confidence: Number(r.confidence) || 50,
      chartBounds: (r.chartBounds as { priceMin: number; priceMax: number }) || { priceMin: 0, priceMax: 100 },
      resistances: Array.isArray(r.resistances) ? r.resistances as { price: number; label: string }[] : [],
      supports: Array.isArray(r.supports) ? r.supports as { price: number; label: string }[] : [],
      trendLine: r.trendLine ?? null,
      currentPrice: r.currentPrice ?? null,
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
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error('Analyze API error:', err);
    const message = err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
