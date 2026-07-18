# Medical Live Caption Platform Handoff

이 문서는 현재 프로젝트를 GitHub 링크로 공유할 때 함께 전달하기 위한 요약 문서입니다.

## 프로젝트 목적

이 프로젝트는 Google AI Studio에서 생성한 단일 행사 실시간 자막 데모 앱을 다중 행사, 다중 세션, 언어별 라이브 자막 화면을 제공하는 운영 플랫폼 구조로 전환하는 작업입니다.

현재 단계의 핵심 목표는 실제 운영 DB나 완성형 번역 worker를 붙이기 전에 플랫폼 화면 구조, 레이아웃 편집 구조, 라이브 자막 스트림 구조를 먼저 분리하는 것입니다.

## 현재 구현된 기능

- React Router 기반 화면 분리
- 관리자 세션 목록 화면
- 세션별 레이아웃 편집 화면
- 언어별 라이브 시청자 화면
- mock platform data 구조 분리
- 배경 이미지 기반 레이아웃 캔버스
- Video, Slide, Caption, Q&A, Notice 컴포넌트 배치
- 컴포넌트 추가, 삭제, 선택
- 컴포넌트 위치와 크기 숫자 편집
- 컴포넌트 드래그 이동
- 컴포넌트 드래그 리사이즈
- 키보드 방향키 이동과 크기 조정
- localStorage 기반 레이아웃 저장
- 라이브 화면에서 저장된 layout 우선 반영
- Gemini Live Translate 기반 실시간 오디오 번역 테스트 흐름
- 관리자 화면에서 번역 오류 로그 확인
- 자막 중복 제거
- 2줄 롤링 자막 UI
- 긴 자막이 들어올 경우 최신 자막 중심으로 표시

## 주요 화면

로컬 서버 실행 후 아래 URL로 확인할 수 있습니다.

- 데모 화면: `http://localhost:3000/demo`
- 관리자 홈: `http://localhost:3000/admin`
- 세션 관리: `http://localhost:3000/admin/sessions`
- 레이아웃 편집: `http://localhost:3000/admin/sessions/main-keynote/layout`
- 한국어 라이브 화면: `http://localhost:3000/live/main-keynote/ko`
- 영어 라이브 화면: `http://localhost:3000/live/main-keynote/en`
- 프랑스어 라이브 화면: `http://localhost:3000/live/main-keynote/fr`

## 실행 방법

Node.js가 설치되어 있어야 합니다.

```bash
npm install
npm run dev
```

빌드 검증:

```bash
npm run lint
npm run build
```

## 환경 변수

`.env.local`은 API Key가 포함될 수 있으므로 GitHub에 올리면 안 됩니다. 이 저장소는 `.env.local`을 Git에서 제외하도록 설정되어 있습니다.

공유할 때는 `.env.local` 대신 `.env.example`만 포함합니다.

필요한 환경 변수 예시는 아래와 같습니다.

```env
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
GEMINI_MODEL="gemini-3.5-flash"
GEMINI_LIVE_MODEL="gemini-3.5-live-translate-preview"
GEMINI_LIVE_API_VERSION="v1alpha"
TRANSLATION_TIMEOUT_MS=20000
APP_URL="http://localhost:3000"
```

## 현재 저장 방식

아직 DB는 연결되어 있지 않습니다.

레이아웃 편집 화면에서 저장한 내용은 브라우저 `localStorage`에 저장됩니다.

예시 key:

```txt
layout:main-keynote
```

라이브 화면은 localStorage에 저장된 layout이 있으면 그것을 우선 사용하고, 없으면 `src/data/mockPlatformData.ts`의 기본 layout을 사용합니다.

## 현재 구조

주요 파일:

- `server.ts`: Express 서버, API, SSE caption stream, WebSocket audio live test 처리
- `src/App.tsx`: React Router 진입 구조
- `src/data/mockPlatformData.ts`: 행사, 세션, layout, display URL mock data
- `src/pages/admin/AdminSessionsPage.tsx`: 관리자 세션 관리 화면
- `src/pages/admin/SessionLayoutEditorPage.tsx`: 세션별 layout 편집 화면
- `src/pages/live/LiveSessionPage.tsx`: 언어별 라이브 시청자 화면
- `src/components/platform/DisplayRenderer.tsx`: layout components 배열을 읽어 실제 라이브 화면 렌더링
- `src/components/platform/CaptionComponent.tsx`: 언어별 자막 표시와 SSE caption stream 구독
- `src/components/platform/VideoComponent.tsx`: 영상 영역 컴포넌트
- `src/components/platform/SlideComponent.tsx`: 슬라이드 영역 컴포넌트
- `src/components/platform/QAComponent.tsx`: Q&A 영역 컴포넌트
- `src/components/platform/NoticeComponent.tsx`: 공지 영역 컴포넌트
- `src/components/platform/LiveAudioTranslationTester.tsx`: 브라우저 오디오 캡처 기반 Live Translate 테스트 UI

## 테스트 흐름

1. `npm run dev`로 서버를 실행합니다.
2. `http://localhost:3000/admin/sessions/main-keynote/layout`에 접속합니다.
3. 배경 이미지와 컴포넌트 위치를 수정합니다.
4. 저장합니다.
5. `http://localhost:3000/live/main-keynote/ko`에 접속합니다.
6. 저장한 layout이 같은 위치로 반영되는지 확인합니다.
7. 관리자 세션 화면에서 Live Translate 테스트를 실행합니다.
8. 라이브 화면의 Caption 컴포넌트에 번역 자막이 표시되는지 확인합니다.
9. `View Transcript`를 열어 접속 이후 수신된 자막이 누적되는지 확인합니다.

## 알려진 제한 사항

- 아직 실제 DB가 없습니다.
- 행사와 세션 생성은 mock data 기반입니다.
- layout 저장은 브라우저 localStorage 기반입니다.
- 실제 라이브 스트림 ingest worker는 아직 분리되어 있지 않습니다.
- Gemini Live Translate는 검증 단계입니다.
- Gemini API quota 제한이 걸리면 번역 테스트가 중단되거나 fallback 동작이 발생할 수 있습니다.
- 실시간 자막 품질은 오디오 입력 품질, 문장 분할, 모델 응답 지연의 영향을 받습니다.

## 다음 작업 제안

1. 행사, 세션, layout DB 모델 설계
2. DB 기반 행사와 세션 CRUD 구현
3. layout template 관리 기능 추가
4. WebSocket 또는 SSE caption stream 구조 정식화
5. Gemini Live Translation worker를 서버와 분리
6. 라이브 스트림 ingest 파이프라인 설계
7. 자막 문장 분할과 지연 시간 튜닝
8. 관리자 운영 모니터링 화면 강화
9. 사용자별 권한 관리
10. 배포 환경 구성

## 공유 시 주의사항

- `.env.local`은 절대 GitHub에 올리지 않습니다.
- API Key는 ChatGPT 대화창, 문서, GitHub issue, README에 붙여넣지 않습니다.
- GitHub 저장소를 공개로 만들 경우 API Key와 개인정보가 포함되어 있지 않은지 반드시 확인합니다.
- 비개발자에게는 GitHub 링크와 이 문서를 함께 전달하면 현재 상태를 가장 쉽게 이해할 수 있습니다.
