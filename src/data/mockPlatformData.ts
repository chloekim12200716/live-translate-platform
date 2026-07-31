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

export interface PlatformChannel {
  id: string;
  eventId: string;
  title: string;
  slug: string;
  speakerName: string;
  notes: string;
  sourceLanguageCode: string;
  videoUrl: string;
  sampleCaptionText: string;
  mode: "live" | "vod";
  slides: PlatformSlide[];
}

export interface PlatformCaptionStyle {
  fontSizePx: number;
  fontFamily: string;
  textBackgroundColor: string;
  textBackgroundTransparent: boolean;
  textColor: string;
}

export const defaultCaptionStyle: PlatformCaptionStyle = {
  fontSizePx: 28,
  fontFamily: "Pretendard, Inter, system-ui, sans-serif",
  textBackgroundColor: "#020617",
  textBackgroundTransparent: false,
  textColor: "#fef9c3"
};

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
  captionStyle?: PlatformCaptionStyle;
}

export interface PlatformLayout {
  id: string;
  eventId: string;
  channelId: string;
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

export interface PlatformDisplayTarget {
  id: string;
  channelId: string;
  name: string;
  description: string;
  layoutId: string;
  defaultLanguageCode: string;
}

export interface PlatformDisplayUrl {
  displayId: string;
  layoutId: string;
  channelSlug: string;
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

export const mockPlatformChannel: PlatformChannel = {
  id: "main-keynote",
  eventId: mockPlatformEvent.id,
  title: "실시간 의학행사 채널",
  slug: "main-keynote",
  speakerName: "Dr. Robert C.",
  notes: "의학 학술행사 기본 테스트 채널",
  sourceLanguageCode: "en",
  videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  sampleCaptionText: "Today we will review the clinical trials of dual-targeting therapies and their cardiometabolic impact.",
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

export const mockEpidemiologyChannel: PlatformChannel = {
  id: "epidemiology-live",
  eventId: mockPlatformEvent.id,
  title: "실시간 역학회 채널",
  slug: "epidemiology-live",
  speakerName: "Dr. Amelia Park",
  notes: "역학회 발표 및 감염병 감시 지표 테스트",
  sourceLanguageCode: "en",
  videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
  sampleCaptionText: "We will review outbreak surveillance indicators and population-level risk signals.",
  mode: "live",
  slides: [
    {
      id: "epi-slide-1",
      title: "감염병 감시 지표와 위험 신호",
      subtitle: "Outbreak Surveillance and Risk Signals",
      points: [
        "지역별 발생률 변화와 이동 평균 추세",
        "고위험군 보호를 위한 조기 경보 기준",
        "현장 보고 데이터와 실험실 확진 데이터의 결합"
      ],
      startsAtSeconds: 0,
      endsAtSeconds: 45
    },
    {
      id: "epi-slide-2",
      title: "Population-Level Intervention Strategy",
      subtitle: "집단 수준 개입 전략",
      points: [
        "접촉률 감소 정책의 시점별 효과",
        "백신 접종률과 재감염 위험 추정",
        "실시간 대시보드 기반 의사결정"
      ],
      startsAtSeconds: 45,
      endsAtSeconds: null
    }
  ]
};

export const mockPressBriefingChannel: PlatformChannel = {
  id: "press-briefing-live",
  eventId: mockPlatformEvent.id,
  title: "실시간 기자간담회 채널",
  slug: "press-briefing-live",
  speakerName: "Press Office",
  notes: "기자간담회 발표 및 Q&A 테스트",
  sourceLanguageCode: "ko",
  videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
  sampleCaptionText: "오늘 기자간담회에서는 신약 허가 일정과 임상 데이터 공개 계획을 설명드리겠습니다.",
  mode: "live",
  slides: [
    {
      id: "press-slide-1",
      title: "기자간담회 주요 발표",
      subtitle: "Regulatory Timeline and Clinical Disclosure",
      points: [
        "신약 허가 신청 일정",
        "3상 임상 결과 공개 계획",
        "질의응답 및 후속 자료 배포 안내"
      ],
      startsAtSeconds: 0,
      endsAtSeconds: null
    }
  ]
};

export const mockPlatformChannels: PlatformChannel[] = [
  mockPlatformChannel,
  mockEpidemiologyChannel,
  mockPressBriefingChannel
];

export function findPlatformChannelById(channelId: string | undefined) {
  return mockPlatformChannels.find((channel) => channel.id === channelId);
}

export function findPlatformChannelBySlug(channelSlug: string | undefined) {
  return mockPlatformChannels.find((channel) => channel.slug === channelSlug);
}

export const mockPlatformLayout: PlatformLayout = {
  id: "layout-default-live-stage",
  eventId: mockPlatformEvent.id,
  channelId: mockPlatformChannel.id,
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
    { id: "component-caption", type: "caption", label: "Caption", x: 4, y: 9, w: 16, h: 3, visible: true, zIndex: 2, captionStyle: { ...defaultCaptionStyle } },
    { id: "component-qa", type: "qa", label: "Q&A", x: 20, y: 9, w: 4, h: 4, visible: true, zIndex: 2 },
    { id: "component-notice", type: "notice", label: "Notice", x: 2, y: 12, w: 17, h: 2, visible: true, zIndex: 2 }
  ]
};

export const mockPlatformLayouts: PlatformLayout[] = [
  mockPlatformLayout,
  {
    ...mockPlatformLayout,
    id: "layout-presentation-focus",
    name: "Presentation Focus Stage",
    components: [
      { id: "component-slide", type: "slide", label: "Slide", x: 2, y: 2, w: 15, h: 8, visible: true, zIndex: 1 },
      { id: "component-video", type: "video", label: "Video", x: 18, y: 2, w: 5, h: 4, visible: true, zIndex: 2 },
      { id: "component-caption", type: "caption", label: "Caption", x: 3, y: 11, w: 18, h: 3, visible: true, zIndex: 3, captionStyle: { ...defaultCaptionStyle } },
      { id: "component-notice", type: "notice", label: "Notice", x: 2, y: 13, w: 21, h: 2, visible: true, zIndex: 2 }
    ]
  },
  {
    ...mockPlatformLayout,
    id: "layout-caption-only",
    name: "Caption Dedicated Stage",
    components: [
      { id: "component-caption", type: "caption", label: "Caption", x: 3, y: 4, w: 19, h: 6, visible: true, zIndex: 3, captionStyle: { ...defaultCaptionStyle } },
      { id: "component-notice", type: "notice", label: "Notice", x: 4, y: 11, w: 17, h: 2, visible: true, zIndex: 2 }
    ]
  },
  {
    ...mockPlatformLayout,
    id: "layout-qa-focus",
    name: "Q&A Focus Stage",
    components: [
      { id: "component-video", type: "video", label: "Video", x: 2, y: 2, w: 9, h: 5, visible: true, zIndex: 1 },
      { id: "component-slide", type: "slide", label: "Slide", x: 11, y: 2, w: 8, h: 5, visible: true, zIndex: 1 },
      { id: "component-qa", type: "qa", label: "Q&A", x: 19, y: 2, w: 5, h: 8, visible: true, zIndex: 2 },
      { id: "component-caption", type: "caption", label: "Caption", x: 2, y: 9, w: 16, h: 3, visible: true, zIndex: 3, captionStyle: { ...defaultCaptionStyle } },
      { id: "component-notice", type: "notice", label: "Notice", x: 2, y: 12, w: 21, h: 2, visible: true, zIndex: 2 }
    ]
  },
  {
    ...mockPlatformLayout,
    id: "layout-epidemiology-caption",
    channelId: mockEpidemiologyChannel.id,
    name: "Epidemiology Caption Stage",
    backgroundColor: "#0f172a",
    components: [
      { id: "component-caption", type: "caption", label: "Caption", x: 3, y: 8, w: 18, h: 4, visible: true, zIndex: 3, captionStyle: { ...defaultCaptionStyle } },
      { id: "component-notice", type: "notice", label: "Notice", x: 4, y: 12, w: 16, h: 2, visible: true, zIndex: 2 }
    ]
  },
  {
    ...mockPlatformLayout,
    id: "layout-press-briefing-caption",
    channelId: mockPressBriefingChannel.id,
    name: "Press Briefing Caption Stage",
    backgroundColor: "#111827",
    components: [
      { id: "component-caption", type: "caption", label: "Caption", x: 2, y: 9, w: 20, h: 3, visible: true, zIndex: 3, captionStyle: { ...defaultCaptionStyle } },
      { id: "component-notice", type: "notice", label: "Notice", x: 3, y: 12, w: 18, h: 2, visible: true, zIndex: 2 }
    ]
  }
];

export const mockPlatformDisplays: PlatformDisplayTarget[] = [
  {
    id: "main-stage",
    channelId: mockPlatformChannel.id,
    name: "강연 메인 송출",
    description: "영상, 슬라이드, 자막, Q&A를 함께 보여주는 기본 행사 화면",
    layoutId: "layout-default-live-stage",
    defaultLanguageCode: "en"
  },
  {
    id: "presentation-stage",
    channelId: mockPlatformChannel.id,
    name: "PPT 중심 송출",
    description: "발표 자료를 크게 보여주고 영상과 자막을 보조로 배치",
    layoutId: "layout-presentation-focus",
    defaultLanguageCode: "en"
  },
  {
    id: "caption-stage",
    channelId: mockPlatformChannel.id,
    name: "자막 전용 송출",
    description: "현장 스크린이나 접근성 화면을 위한 큰 자막 중심 화면",
    layoutId: "layout-caption-only",
    defaultLanguageCode: "ko"
  },
  {
    id: "qa-stage",
    channelId: mockPlatformChannel.id,
    name: "Q&A 포함 송출",
    description: "청중 질문 영역을 강조하는 상호작용형 화면",
    layoutId: "layout-qa-focus",
    defaultLanguageCode: "en"
  },
  {
    id: "epidemiology-main",
    channelId: mockEpidemiologyChannel.id,
    name: "역학회 자막 송출",
    description: "역학회 발표를 위한 실시간 자막 오버레이 채널",
    layoutId: "layout-epidemiology-caption",
    defaultLanguageCode: "ko"
  },
  {
    id: "press-briefing-main",
    channelId: mockPressBriefingChannel.id,
    name: "기자간담회 자막 송출",
    description: "기자간담회 질의응답과 발표 내용을 위한 실시간 자막 오버레이 채널",
    layoutId: "layout-press-briefing-caption",
    defaultLanguageCode: "en"
  }
];

export const mockDisplayUrls: PlatformDisplayUrl[] = [
  ...mockPlatformDisplays.flatMap((display) => {
    const channel = findPlatformChannelById(display.channelId) ?? mockPlatformChannel;

    return [
      { displayId: display.id, layoutId: display.layoutId, channelSlug: channel.slug, languageCode: "ar", label: `${display.name} · Arabic`, path: `/live/${channel.slug}/ar?layoutId=${display.layoutId}` },
      { displayId: display.id, layoutId: display.layoutId, channelSlug: channel.slug, languageCode: "zh", label: `${display.name} · Chinese`, path: `/live/${channel.slug}/zh?layoutId=${display.layoutId}` },
      { displayId: display.id, layoutId: display.layoutId, channelSlug: channel.slug, languageCode: "en", label: `${display.name} · English`, path: `/live/${channel.slug}/en?layoutId=${display.layoutId}` },
      { displayId: display.id, layoutId: display.layoutId, channelSlug: channel.slug, languageCode: "fr", label: `${display.name} · French`, path: `/live/${channel.slug}/fr?layoutId=${display.layoutId}` },
      { displayId: display.id, layoutId: display.layoutId, channelSlug: channel.slug, languageCode: "ru", label: `${display.name} · Russian`, path: `/live/${channel.slug}/ru?layoutId=${display.layoutId}` },
      { displayId: display.id, layoutId: display.layoutId, channelSlug: channel.slug, languageCode: "es", label: `${display.name} · Spanish`, path: `/live/${channel.slug}/es?layoutId=${display.layoutId}` }
    ];
  })
];

export const mockPlatformData = {
  event: mockPlatformEvent,
  channel: mockPlatformChannel,
  channels: mockPlatformChannels,
  layout: mockPlatformLayout,
  layouts: mockPlatformLayouts,
  displays: mockPlatformDisplays,
  components: mockPlatformLayout.components,
  displayUrls: mockDisplayUrls
};
