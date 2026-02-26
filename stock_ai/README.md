# Chart AI – 차트 AI 분석 웹사이트

주식·코인 등 **차트 이미지**를 업로드하면 AI가 기술적 분석(추천, 지지/저항, 진입·손절·익절, 매매 전략)을 해주는 웹사이트입니다.

## 기능

- **차트 이미지 업로드**: 드래그 앤 드롭 또는 클릭으로 캔들/봉 차트 이미지 업로드
- **AI 분석**: OpenAI Vision(GPT-4o)으로 차트 분석 후 구조화된 결과 반환
- **결과 표시**
  - 추천(매수/매도/관망) 및 신뢰도
  - 시각적 분석: 업로드한 차트 위에 지지선·저항선·추세선 오버레이
  - 주요 가격대, 진입가·손절가·익절가, 리스크/리워드
  - 상세 분석(요약, 추세, 패턴, 기술적 지표), 매매 전략

## 실행 방법

- **Node.js 20.9 이상** 필요 (Next.js 16 요구 사항)

1. **의존성 설치**
   ```bash
   npm install
   ```

2. **환경 변수 설정**  
   프로젝트 루트에 `.env.local` 파일을 만들고 OpenAI API 키를 넣습니다.
   ```env
   OPENAI_API_KEY=sk-...
   ```
   (`.env.local.example` 참고)

3. **개발 서버 실행**
   ```bash
   npm run dev
   ```
   브라우저에서 [http://localhost:3000](http://localhost:3000) 으로 접속합니다.

4. **빌드 및 프로덕션 실행**
   ```bash
   npm run build
   npm start
   ```

## 기술 스택

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **API**: Next.js API Route (`/api/analyze`)
- **AI**: OpenAI API (GPT-4o with vision)

## npm install 시 참고

- **`node-domexception` deprecated 경고**: `openai` 패키지의 하위 의존성에서 나오는 경고로, 무시해도 됩니다. (Node.js에 내장된 DOMException 사용 권장 메시지)
- **취약점 경고가 나오면**: 터미널에서 `npm audit fix`를 실행해 보세요. (옵션은 **`--force`** 이며, `--` 와 `force` 사이에 공백을 넣으면 안 됩니다.) 이 프로젝트는 Next.js 16으로 올려 해당 취약점을 해결해 두었습니다.

## 참고

- AI 분석 결과는 **참고용**이며, 투자 권유가 아닙니다. 투자 책임은 본인에게 있습니다.
