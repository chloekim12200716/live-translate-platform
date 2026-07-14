export type PlatformComponentType = "video" | "slide" | "caption" | "qa" | "notice";

export interface PlatformEvent {
  id: string;
  name: string;
  slug: string;
  description: string;
  defaultLanguageCode: string;
  backgroundImageUrl: string;
}

export interface PlatformSlide {
  id: string;
  title: string;
  subtitle: string;
  points: string[];
  startsAtSeconds: number;
  endsAtSeconds: number | null;
}

export interface PlatformSession {
  id: string;
  eventId: string;
  title: string;
  slug: string;
  speakerName: string;
  speakerAffiliation: string;
  sourceLanguageCode: string;
  videoUrl: string;
  mode: "live" | "vod";
  slides: PlatformSlide[];
}

export interface PlatformLayoutComponent {
  id: string;
  type: PlatformComponentType;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  visible: boolean;
  zIndex: number;
}

export interface PlatformLayout {
  id: string;
  eventId: string;
  sessionId: string;
  name: string;
  columns: number;
  rows: number;
  canvasWidth: number;
  canvasHeight: number;
  backgroundImageUrl: string;
  backgroundFit: "cover" | "contain" | "fill";
  backgroundPositionX: number;
  backgroundPositionY: number;
  backgroundColor: string;
  components: PlatformLayoutComponent[];
}

export interface PlatformDisplayUrl {
  sessionSlug: string;
  languageCode: string;
  label: string;
  path: string;
}

export const mockPlatformEvent: PlatformEvent = {
  id: "event-medicast-2026",
  name: "Global Hybrid Medical Symposium 2026",
  slug: "global-hybrid-medical-symposium-2026",
  description: "AI Studio demo content promoted to the first platform event template.",
  defaultLanguageCode: "ko",
  backgroundImageUrl: "https://ai.google.dev/static/site-assets/images/share-ais-513315318.png"
};

export const mockPlatformSession: PlatformSession = {
  id: "main-keynote",
  eventId: mockPlatformEvent.id,
  title: "Dual-Targeting Therapy for Cardiometabolic Diseases",
  slug: "main-keynote",
  speakerName: "Dr. Robert C.",
  speakerAffiliation: "Cleveland Clinic",
  sourceLanguageCode: "en",
  videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  mode: "live",
  slides: [
    {
      id: "slide-1",
      title: "대사질환 치료를 위한 이중 표적 신약",
      subtitle: "Dual-Targeting Therapy for Cardiometabolic Diseases",
      points: [
        "이중 표적 치료제의 임상 기전 및 약동학적 특성",
        "제2형 당뇨병 환자에서의 대사 기능 개선 효과",
        "SGLT2 억제제 및 GLP-1 receptor agonist 병용 가능성 검토"
      ],
      startsAtSeconds: 0,
      endsAtSeconds: 30
    },
    {
      id: "slide-2",
      title: "GLP-1 Receptor Agonists & Metabolic Regulation",
      subtitle: "대사 조절 및 인슐린 분비 시너지 효과",
      points: [
        "췌장 베타세포 보호 및 당화혈색소(HbA1c) 강하 작용",
        "체중 감량 및 심혈관 보호(CV benefit) 3상 임상 보고",
        "주요 이상반응(Adverse event): 소화기계 경증 증상 완화 대책"
      ],
      startsAtSeconds: 30,
      endsAtSeconds: 75
    },
    {
      id: "slide-3",
      title: "SGLT2 억제제(Empagliflozin) Primary Endpoint",
      subtitle: "심부전 입원 및 심혈관 사망률 감소 수치",
      points: [
        "1차 평가변수(Primary endpoint): 심혈관 사망 및 심부전 입원율 14% 유의미한 감소",
        "신장 보호 효과에 대한 후속 하위 그룹(Subgroup) 분석",
        "안정성 및 위장관 부작용 비율 대조군과 동등 수준 확인"
      ],
      startsAtSeconds: 75,
      endsAtSeconds: null
    }
  ]
};

export const mockPlatformLayout: PlatformLayout = {
  id: "layout-default-live-stage",
  eventId: mockPlatformEvent.id,
  sessionId: mockPlatformSession.id,
  name: "Default Live Translation Stage",
  columns: 24,
  rows: 14,
  canvasWidth: 1920,
  canvasHeight: 1080,
  backgroundImageUrl: mockPlatformEvent.backgroundImageUrl,
  backgroundFit: "cover",
  backgroundPositionX: 50,
  backgroundPositionY: 50,
  backgroundColor: "#020617",
  components: [
    { id: "component-video", type: "video", label: "Video", x: 2, y: 2, w: 11, h: 6, visible: true, zIndex: 1 },
    { id: "component-slide", type: "slide", label: "Slide", x: 13, y: 2, w: 10, h: 6, visible: true, zIndex: 1 },
    { id: "component-caption", type: "caption", label: "Caption", x: 4, y: 9, w: 16, h: 3, visible: true, zIndex: 2 },
    { id: "component-qa", type: "qa", label: "Q&A", x: 20, y: 9, w: 4, h: 4, visible: true, zIndex: 2 },
    { id: "component-notice", type: "notice", label: "Notice", x: 2, y: 12, w: 17, h: 2, visible: true, zIndex: 2 }
  ]
};

export const mockDisplayUrls: PlatformDisplayUrl[] = [
  { sessionSlug: mockPlatformSession.slug, languageCode: "ar", label: "Arabic", path: `/live/${mockPlatformSession.slug}/ar` },
  { sessionSlug: mockPlatformSession.slug, languageCode: "zh", label: "Chinese", path: `/live/${mockPlatformSession.slug}/zh` },
  { sessionSlug: mockPlatformSession.slug, languageCode: "en", label: "English", path: `/live/${mockPlatformSession.slug}/en` },
  { sessionSlug: mockPlatformSession.slug, languageCode: "fr", label: "French", path: `/live/${mockPlatformSession.slug}/fr` },
  { sessionSlug: mockPlatformSession.slug, languageCode: "ru", label: "Russian", path: `/live/${mockPlatformSession.slug}/ru` },
  { sessionSlug: mockPlatformSession.slug, languageCode: "es", label: "Spanish", path: `/live/${mockPlatformSession.slug}/es` }
];

export const mockPlatformData = {
  event: mockPlatformEvent,
  session: mockPlatformSession,
  layout: mockPlatformLayout,
  components: mockPlatformLayout.components,
  displayUrls: mockDisplayUrls
};
