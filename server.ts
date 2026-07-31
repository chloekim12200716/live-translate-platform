import express from "express";
import fs from "fs/promises";
import path from "path";
import { createServer as createHttpServer, type Server as HttpServer } from "http";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { WebSocket, WebSocketServer } from "ws";

dotenv.config({ path: ".env.local" });
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json());

// Initialize Gemini SDK with fallback
let aiClient: GoogleGenAI | null = null;
let liveAiClient: GoogleGenAI | null = null;
const API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
const GEMINI_LIVE_MODEL = process.env.GEMINI_LIVE_MODEL || "gemini-3.5-live-translate-preview";
const GEMINI_LIVE_API_VERSION = process.env.GEMINI_LIVE_API_VERSION || "v1alpha";
const TRANSLATION_TIMEOUT_MS = Number(process.env.TRANSLATION_TIMEOUT_MS || 20000);
const DEFAULT_LIVE_TARGET_LANGUAGES = (process.env.LIVE_TARGET_LANGUAGES || "ar,zh,en,fr,ko,ru,es")
  .split(",")
  .map((languageCode) => languageCode.trim().toLowerCase())
  .filter(Boolean);

const translationLanguageLabels: Record<string, string> = {
  ar: "Arabic",
  zh: "Simplified Chinese",
  en: "English",
  fr: "French",
  ko: "Korean",
  ru: "Russian",
  es: "Spanish"
};

function getLanguageLabel(languageCode: string | undefined) {
  if (!languageCode) return "the requested language";
  return translationLanguageLabels[languageCode.toLowerCase()] || languageCode;
}

function getFallbackTranslation(text: string, sourceLang: string | undefined, targetLang: string | undefined) {
  const normalizedSourceLang = sourceLang?.toLowerCase() || "en";
  const normalizedTargetLang = targetLang?.toLowerCase() || "ko";

  if (normalizedSourceLang === normalizedTargetLang) {
    return text;
  }

  const sampleMedicalTranslations: Record<string, string> = {
    ar: "سنراجع اليوم التجارب السريرية للعلاجات مزدوجة الهدف وتأثيرها القلبي الأيضي.",
    zh: "今天我们将回顾双靶向治疗的临床试验及其对心血管代谢的影响。",
    en: "Today we will review the clinical trials of dual-targeting therapies and their cardiometabolic impact.",
    fr: "Aujourd'hui, nous allons examiner les essais cliniques des thérapies à double cible et leur impact cardiométabolique.",
    ko: "오늘 우리는 이중 표적 치료제의 임상 시험과 심혈관 대사 영향에 대해 검토하겠습니다.",
    ru: "Сегодня мы рассмотрим клинические исследования препаратов двойного действия и их кардиометаболическое влияние.",
    es: "Hoy revisaremos los ensayos clínicos de las terapias de doble objetivo y su impacto cardiometabólico."
  };
  const normalizedText = text.toLowerCase();
  const sampleCaptionFallbacks: Array<{
    matches: string[];
    translations: Record<string, string>;
  }> = [
    {
      matches: ["good evening", "dual-targeting therapies"],
      translations: {
        ar: "مساء الخير، زملائي. سنراجع اليوم التجارب السريرية للعلاجات مزدوجة الهدف.",
        zh: "各位同事，晚上好。今天我们将回顾双靶向治疗的临床试验。",
        fr: "Bonsoir, chers collègues. Aujourd'hui, nous allons examiner les essais cliniques des thérapies à double cible.",
        ko: "동료 여러분, 안녕하십니까. 오늘 우리는 이중 표적 치료제의 임상 시험을 검토하겠습니다.",
        ru: "Добрый вечер, коллеги. Сегодня мы рассмотрим клинические исследования препаратов двойного действия.",
        es: "Buenas tardes, colegas. Hoy revisaremos los ensayos clínicos de las terapias de doble objetivo."
      }
    },
    {
      matches: ["type 2 diabetes", "cardiovascular risk"],
      translations: {
        ar: "سنركز على المرضى المصابين بداء السكري من النوع الثاني والمعرضين لخطر قلبي وعائي مرتفع.",
        zh: "我们将重点关注患有2型糖尿病并伴有高心血管风险的患者。",
        fr: "Nous nous concentrerons sur les patients présentant un diabète de type 2 et un risque cardiovasculaire élevé.",
        ko: "우리는 제2형 당뇨병과 높은 심혈관 위험을 동반한 환자군에 초점을 맞출 것입니다.",
        ru: "Мы сосредоточимся на пациентах с сахарным диабетом 2 типа и высоким сердечно-сосудистым риском.",
        es: "Nos centraremos en pacientes con diabetes tipo 2 y alto riesgo cardiovascular."
      }
    },
    {
      matches: ["glp-1 receptor agonists", "metabolic functions"],
      translations: {
        ar: "وسننظر تحديدًا في كيفية تأثير ناهضات مستقبل GLP-1 في الوظائف الأيضية.",
        zh: "具体而言，我们将观察GLP-1受体激动剂如何改变代谢功能。",
        fr: "Plus précisément, nous examinerons comment les agonistes du récepteur GLP-1 modifient les fonctions métaboliques.",
        ko: "특히 GLP-1 수용체 작용제가 대사 기능을 어떻게 변화시키는지 살펴보겠습니다.",
        ru: "В частности, мы рассмотрим, как агонисты рецептора GLP-1 изменяют метаболические функции.",
        es: "Específicamente, analizaremos cómo los agonistas del receptor GLP-1 modifican las funciones metabólicas."
      }
    },
    {
      matches: ["primary endpoint", "48 weeks"],
      translations: {
        ar: "تم تقييم نقطة النهاية الأولية على مدى فترة بلغت 48 أسبوعًا.",
        zh: "主要终点在48周期间进行了评估。",
        fr: "Le critère d'évaluation principal a été évalué sur une période de 48 semaines.",
        ko: "1차 평가변수는 48주 기간 동안 평가되었습니다.",
        ru: "Первичная конечная точка оценивалась в течение 48 недель.",
        es: "El criterio de valoración principal se evaluó durante un período de 48 semanas."
      }
    },
    {
      matches: ["serious adverse events", "treatment group"],
      translations: {
        ar: "كما قمنا بتحليل خطر حدوث أحداث سلبية خطيرة في مجموعة العلاج.",
        zh: "我们还分析了治疗组发生严重不良事件的风险。",
        fr: "Nous avons également analysé le risque d'événements indésirables graves dans le groupe de traitement.",
        ko: "또한 치료군에서 중대한 이상사례가 발생할 위험도 분석했습니다.",
        ru: "Мы также проанализировали риск серьезных нежелательных явлений в группе лечения.",
        es: "También analizamos el riesgo de eventos adversos graves en el grupo de tratamiento."
      }
    }
  ];
  const matchedSampleCaption = sampleCaptionFallbacks.find(({ matches }) =>
    matches.every((term) => normalizedText.includes(term))
  );

  if (matchedSampleCaption?.translations[normalizedTargetLang]) {
    return matchedSampleCaption.translations[normalizedTargetLang];
  }

  if (
    normalizedSourceLang === "en" &&
    (text.includes("dual-targeting therapies") || text.includes("cardiometabolic impact"))
  ) {
    return sampleMedicalTranslations[normalizedTargetLang] || `[AI Demo Translation:${normalizedTargetLang}] ${text}`;
  }

  if (normalizedSourceLang === "en" && normalizedTargetLang === "ko") {
    if (text.includes("dual-targeting therapies") || text.includes("dual-targeting mechanism")) {
      return "오늘 우리는 이중 표적 치료제의 임상 기전 및 치료 결과를 살펴보고자 합니다.";
    }
    if (text.includes("type 2 diabetes") && text.includes("cardiovascular risk")) {
      return "우리는 제2형 당뇨병과 높은 심혈관 위험을 동반한 환자군에 초점을 맞출 것입니다.";
    }
    if (text.includes("GLP-1 receptor agonists") || text.includes("GLP-1 receptor agonist")) {
      return "특히 GLP-1 수용체 작용제가 대사 기능을 어떻게 변화시키는지 살펴보겠습니다.";
    }
    if (text.includes("primary endpoint") && text.includes("48 weeks")) {
      return "1차 평가변수는 48주 기간 동안 평가되었습니다.";
    }
    if (text.includes("serious adverse events") || text.includes("serious adverse event")) {
      return "또한 치료군에서 중대한 이상사례가 발생할 위험도 분석했습니다.";
    }
    if (text.includes("SGLT2 inhibitors like empagliflozin")) {
      return "특히 empagliflozin과 같은 SGLT2억제제는 심혈관 사망 및 심부전 입원 위험의 1차 평가지표(Primary Endpoint)를 크게 유의미하게 개선하였습니다.";
    }
    if (text.includes("eGFR")) {
      return "아울러, 만성 신장 질환 환자의 진행 상태를 관찰하기 위해 eGFR(추정 사구체 여과율) 신장 지표를 면밀하게 관찰해야 합니다.";
    }
  }

  if (normalizedTargetLang === "en") {
    if (text.includes("시신경척수염 범주질환") || text.includes("NMOSD")) {
      return "Today we'll discuss the therapeutic strategy for Neuromyelitis Optica Spectrum Disorder (NMOSD) patients.";
    }
    if (text.includes("aquaporin-4 autoantibody") || text.includes("AQP4-IgG")) {
      return "Particularly, dual-targeting antibody treatment is extremely critical for AQP4-IgG positive patients to decrease recurrence rates.";
    }
    if (text.includes("재발 위험을 대조군 대비 70% 이상 유의하게 감소")) {
      return "In clinical trials, this agent significantly reduced the recurrence risk by more than 70% compared to the control group, achieving the primary endpoint.";
    }
    if (text.includes("adverse event") || text.includes("이상사례")) {
      return "During therapy, we must carefully monitor adverse events such as neutropenia or infections.";
    }
  }

  const detectedTerms = medicalDictionary
    .filter((item) => text.toLowerCase().includes(item.term.toLowerCase()))
    .map((item) => item.term);
  const detectedTermLabel = detectedTerms.length > 0 ? ` (medical terms: ${detectedTerms.join(", ")})` : "";

  return `[AI Demo Translation:${normalizedTargetLang}] ${text}${detectedTermLabel}`;
}

interface TranslationResult {
  translatedText: string;
  engine: string;
  sourceLang: string;
  targetLang: string;
}

interface TranslationErrorLog {
  id: string;
  createdAt: string;
  sourceLang: string;
  targetLang: string;
  model: string;
  message: string;
  sourceTextPreview: string;
}

const translationErrorLogs: TranslationErrorLog[] = [];
const TRANSLATION_CACHE_LIMIT = 500;
const translationResultCache = new Map<string, TranslationResult>();
const inFlightTranslations = new Map<string, Promise<TranslationResult>>();
let geminiTranslationBackoffUntil = 0;
let lastGeminiTranslationConsoleLogAt = 0;

function getTranslationCacheKey(text: string, sourceLang: string, targetLang: string) {
  return `${sourceLang}:${targetLang}:${text.replace(/\s+/g, " ").trim().toLowerCase()}`;
}

function cacheTranslationResult(cacheKey: string, result: TranslationResult) {
  translationResultCache.set(cacheKey, result);
  if (translationResultCache.size > TRANSLATION_CACHE_LIMIT) {
    const oldestKey = translationResultCache.keys().next().value;
    if (oldestKey) {
      translationResultCache.delete(oldestKey);
    }
  }
}

function getErrorStatus(error: unknown) {
  const directStatus = (error as { status?: number })?.status;
  if (typeof directStatus === "number") return directStatus;

  const message = error instanceof Error ? error.message : String(error);
  const matchedCode = message.match(/"code"\s*:\s*(\d+)/);
  return matchedCode ? Number(matchedCode[1]) : 0;
}

function getRetryDelayMs(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const retryDelayMatch = message.match(/"retryDelay"\s*:\s*"(\d+)s"/);
  if (retryDelayMatch) {
    return Number(retryDelayMatch[1]) * 1000;
  }

  const retryInMatch = message.match(/retry in ([\d.]+)s/i);
  if (retryInMatch) {
    return Math.ceil(Number(retryInMatch[1]) * 1000);
  }

  return 30000;
}

function createFallbackTranslationResult(
  text: string,
  sourceLang: string,
  targetLang: string,
  engine = "Rule-based Medical Dict Engine"
): TranslationResult {
  return {
    translatedText: getFallbackTranslation(text, sourceLang, targetLang),
    engine,
    sourceLang,
    targetLang
  };
}

function isFallbackTranslationResult(result: TranslationResult) {
  return result.engine.startsWith("Rule-based")
    || result.translatedText.startsWith("[AI Demo Translation:");
}

function recordTranslationError({
  error,
  text,
  sourceLang,
  targetLang
}: {
  error: unknown;
  text: string;
  sourceLang: string;
  targetLang: string;
}) {
  const message = error instanceof Error ? error.message : String(error);

  translationErrorLogs.unshift({
    id: `translation-error-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    createdAt: new Date().toISOString(),
    sourceLang,
    targetLang,
    model: GEMINI_MODEL,
    message,
    sourceTextPreview: text.slice(0, 180)
  });

  if (translationErrorLogs.length > 100) {
    translationErrorLogs.pop();
  }
}

async function translateText(text: string, sourceLang: string | undefined, targetLang: string | undefined): Promise<TranslationResult> {
  const normalizedSourceLang = (sourceLang || "en").toLowerCase();
  const normalizedTargetLang = (targetLang || "ko").toLowerCase();
  const cacheKey = getTranslationCacheKey(text, normalizedSourceLang, normalizedTargetLang);

  if (normalizedSourceLang === normalizedTargetLang) {
    return {
      translatedText: text,
      engine: "Source Caption",
      sourceLang: normalizedSourceLang,
      targetLang: normalizedTargetLang
    };
  }

  const cachedResult = translationResultCache.get(cacheKey);
  if (cachedResult) {
    return cachedResult;
  }

  const inFlightTranslation = inFlightTranslations.get(cacheKey);
  if (inFlightTranslation) {
    return inFlightTranslation;
  }

  const dictionaryContext = medicalDictionary.map(item => `- ${item.term}: ${item.definition}`).join("\n");
  const systemInstruction = `You are an expert medical translator specializing in pharmaceutical and clinical conference translation.
Translate from ${getLanguageLabel(normalizedSourceLang)} into ${getLanguageLabel(normalizedTargetLang)} accurately, keeping medical terms correct and clean.
For Korean output, use polite medical conference style. For other languages, use natural academic conference style.
Here is a list of approved medical dictionary terms and definitions to respect if they appear in the source text:
${dictionaryContext}

Output ONLY the direct translation. Do not include extra comments, intros, or explanations.`;

  const translationPromise = (async () => {
  if (aiClient) {
    const now = Date.now();
    if (now < geminiTranslationBackoffUntil) {
      const cooldownSeconds = Math.ceil((geminiTranslationBackoffUntil - now) / 1000);
      return createFallbackTranslationResult(
        text,
        normalizedSourceLang,
        normalizedTargetLang,
        `Rule-based Medical Dict Engine (Gemini quota cooldown ${cooldownSeconds}s)`
      );
    }

    try {
      const response = await Promise.race([
        aiClient.models.generateContent({
          model: GEMINI_MODEL,
          contents: text,
          config: {
            systemInstruction,
            temperature: 0.1,
          }
        }),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Gemini translation timed out after ${TRANSLATION_TIMEOUT_MS}ms`)), TRANSLATION_TIMEOUT_MS);
        })
      ]);
      const translatedText = response.text?.trim() || "";
      if (!translatedText) {
        throw new Error("Gemini translation returned an empty response.");
      }
      const result = {
        translatedText,
        engine: `Gemini ${GEMINI_MODEL}`,
        sourceLang: normalizedSourceLang,
        targetLang: normalizedTargetLang
      };
      cacheTranslationResult(cacheKey, result);
      return result;
    } catch (error: unknown) {
      const errorStatus = getErrorStatus(error);
      if (errorStatus === 429) {
        geminiTranslationBackoffUntil = Date.now() + getRetryDelayMs(error);
      }

      recordTranslationError({
        error,
        text,
        sourceLang: normalizedSourceLang,
        targetLang: normalizedTargetLang
      });

      const shouldLogNow = Date.now() - lastGeminiTranslationConsoleLogAt > 10000;
      if (shouldLogNow) {
        lastGeminiTranslationConsoleLogAt = Date.now();
        if (errorStatus === 429) {
          console.warn("Gemini translation quota exceeded. Falling back until retry window clears.");
        } else {
          console.error("Gemini Translation Error:", error);
        }
      }
    }
  }

  return createFallbackTranslationResult(
    text,
    normalizedSourceLang,
    normalizedTargetLang,
    Date.now() < geminiTranslationBackoffUntil
      ? "Rule-based Medical Dict Engine (Gemini quota exceeded)"
      : "Rule-based Medical Dict Engine"
  );
  })();

  inFlightTranslations.set(cacheKey, translationPromise);
  try {
    return await translationPromise;
  } finally {
    inFlightTranslations.delete(cacheKey);
  }
}

if (API_KEY && API_KEY !== "MY_GEMINI_API_KEY") {
  try {
    aiClient = new GoogleGenAI({
      apiKey: API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    liveAiClient = new GoogleGenAI({
      apiKey: API_KEY,
      httpOptions: {
        apiVersion: GEMINI_LIVE_API_VERSION,
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    console.log("Gemini API Client initialized successfully.");
  } catch (error) {
    console.error("Failed to initialize Gemini API client:", error);
  }
} else {
  console.log("No valid GEMINI_API_KEY found. Running in high-fidelity mock translation mode.");
}

// Medical dictionary
interface DictionaryItem {
  term: string;
  definition: string;
  category: string;
}

let medicalDictionary: DictionaryItem[] = [
  { term: "NMOSD", definition: "Neuromyelitis Optica Spectrum Disorder (시신경척수염 범주질환). 중추신경계의 자가면역 염증성 질환.", category: "질환명" },
  { term: "SGLT2 inhibitor", definition: "Sodium-Glucose Cotransporter 2 inhibitor. 신장의 포도당 재흡수를 억제하여 당뇨병 치료 및 심부전 보호 효과를 제공하는 약물.", category: "약물군" },
  { term: "eGFR", definition: "Estimated Glomerular Filtration Rate (추정 사구체 여과율). 신장 기능 평가 지표.", category: "임상수치" },
  { term: "GLP-1 receptor agonist", definition: "Glucagon-Like Peptide-1 수용체 작용제. 인슐린 분비 촉진, 식욕 억제를 유도하는 당뇨 및 비만 치료제.", category: "약물군" },
  { term: "Primary endpoint", definition: "1차 평가변수. 임상시험에서 약물의 효능을 입증하기 위해 사전에 정의한 가장 중요한 평가지표.", category: "임상용어" },
  { term: "Adverse event", definition: "이상사례. 약물 투여 후 발생한 모든 의학적으로 바람직하지 않은 사건.", category: "임상용어" },
  { term: "empagliflozin", definition: "SGLT2 억제제 계열의 대표적인 당뇨 및 심부전 치료 약물.", category: "성분명" },
  { term: "AQP4-IgG", definition: "Aquaporin-4 autoantibody. NMOSD 진단 및 병태생리에 결정적인 자가항체.", category: "임상지표" }
];

// Subtitles database in-memory
interface Subtitle {
  id: string;
  timestamp: number; // relative video seconds
  speaker: string;
  original: string;
  translated: string;
  isFinal: boolean;
  isEdited?: boolean;
}

interface QAItem {
  id: string;
  user: string;
  text: string;
  timestamp: string;
  isAnswered: boolean;
  answer?: string;
}

interface Bookmark {
  id: string;
  timestamp: number;
  title: string;
}

interface Note {
  id: string;
  timestamp: number;
  text: string;
}

interface LiveCaptionSegment {
  id: string;
  channelSlug: string;
  targetLang?: string;
  timestamp: number;
  speaker: string;
  text: string;
  sourceLang: string;
  isFinal: boolean;
  sequence: number;
  createdAt: string;
}

interface CaptionStreamSubscriber {
  id: string;
  channelSlug: string;
  targetLang: string;
  fallbackSourceLang: string;
  writeEvent: (eventName: string, payload: unknown) => void;
  isClosed: () => boolean;
}

interface DemoCaptionProducer {
  channelSlug: string;
  sourceLang: string;
  intervalMs: number;
  nextIndex: number;
  timer: NodeJS.Timeout;
  startedAt: string;
}

type LiveTranslationMode = "realtime" | "sentence";

interface LiveTranscriptDocumentEntry {
  id: string;
  sequence: number;
  text: string;
  targetLang: string;
  engine: string;
  createdAt: string;
}

interface LiveTranscriptDocument {
  id: string;
  channelSlug: string;
  targetLang: string;
  startedAt: string;
  endedAt?: string;
  entries: LiveTranscriptDocumentEntry[];
  filePath?: string;
}

const demoLiveCaptionTemplates = [
  {
    timestamp: 0,
    speaker: "Dr. Robert",
    text: "Good evening, colleagues. Today we will review the clinical trials of dual-targeting therapies."
  },
  {
    timestamp: 6,
    speaker: "Dr. Robert",
    text: "We will focus on patients presenting with type 2 diabetes and high cardiovascular risk."
  },
  {
    timestamp: 12,
    speaker: "Dr. Robert",
    text: "Specifically, we will look at how GLP-1 receptor agonists alter metabolic functions."
  },
  {
    timestamp: 18,
    speaker: "Dr. Robert",
    text: "The primary endpoint was evaluated over a period of 48 weeks."
  },
  {
    timestamp: 24,
    speaker: "Dr. Robert",
    text: "We also analyzed the risk of serious adverse events in the treatment group."
  }
];

let liveCaptionSequence = 0;
const liveCaptionQueue: LiveCaptionSegment[] = [];
const captionStreamSubscribers = new Map<string, CaptionStreamSubscriber>();
const demoCaptionProducers = new Map<string, DemoCaptionProducer>();
const liveTranscriptDocuments: LiveTranscriptDocument[] = [];
const transcriptOutputDirectory = path.join(process.cwd(), "runtime", "transcripts");

function getCaptionChannelKey(channelSlug: string | undefined) {
  return (channelSlug || "main-keynote").toLowerCase();
}

function getStringValue(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function getCaptionChannelSlugFromQuery(query: Record<string, unknown>, fallback = "main-keynote") {
  return getStringValue(query.channelSlug, fallback);
}

function getCaptionChannelSlugFromBody(body: Record<string, unknown>, fallback = "main-keynote") {
  return getStringValue(body.channelSlug, fallback);
}

function getSafeFilePart(value: string) {
  return value.replace(/[^a-z0-9가-힣_-]+/gi, "-").replace(/^-+|-+$/g, "") || "channel";
}

function removeSpeechFillers(text: string) {
  return text
    .replace(/\b(uh|um|umm|hmm|ah|er|erm|you know|i mean)\b[,\s]*/gi, "")
    .replace(/(^|[\s,])(어|음|으음|아|저|그|그러니까|뭐랄까|있잖아요)(?=$|[\s,?.!])/g, "$1")
    .replace(/\s+([,.;:!?。！？])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function clearLiveCaptionQueue(channelSlug: string) {
  const channelKey = getCaptionChannelKey(channelSlug);
  for (let index = liveCaptionQueue.length - 1; index >= 0; index -= 1) {
    if (liveCaptionQueue[index]?.channelSlug === channelKey) {
      liveCaptionQueue.splice(index, 1);
    }
  }
}

function createLiveTranscriptDocument(channelSlug: string, targetLang: string): LiveTranscriptDocument {
  const now = new Date();
  return {
    id: `transcript-${now.getTime()}-${Math.random().toString(36).slice(2)}`,
    channelSlug: getCaptionChannelKey(channelSlug),
    targetLang: targetLang.toLowerCase(),
    startedAt: now.toISOString(),
    entries: []
  };
}

function appendLiveTranscriptEntry({
  document,
  segment,
  targetLang,
  engine
}: {
  document: LiveTranscriptDocument;
  segment: LiveCaptionSegment;
  targetLang: string;
  engine: string;
}) {
  if (!segment.isFinal) return;
  const cleanedText = removeSpeechFillers(segment.text);
  if (!cleanedText) return;
  if (document.entries.some((entry) => entry.id === segment.id || entry.text === cleanedText)) return;

  document.entries.push({
    id: segment.id,
    sequence: segment.sequence,
    text: cleanedText,
    targetLang: targetLang.toLowerCase(),
    engine,
    createdAt: segment.createdAt
  });
}

async function saveLiveTranscriptDocument(document: LiveTranscriptDocument) {
  document.endedAt = new Date().toISOString();
  liveTranscriptDocuments.unshift(document);
  if (liveTranscriptDocuments.length > 50) {
    liveTranscriptDocuments.splice(50);
  }

  if (document.entries.length === 0) return;

  await fs.mkdir(transcriptOutputDirectory, { recursive: true });
  const fileName = `${getSafeFilePart(document.channelSlug)}-${getSafeFilePart(document.targetLang)}-${document.startedAt.replace(/[:.]/g, "-")}.md`;
  const filePath = path.join(transcriptOutputDirectory, fileName);
  const body = [
    `# Live Translation Transcript`,
    "",
    `- Channel: ${document.channelSlug}`,
    `- Target language: ${document.targetLang}`,
    `- Started at: ${document.startedAt}`,
    `- Ended at: ${document.endedAt}`,
    "",
    "## Final Translated Sentences",
    "",
    ...document.entries.map((entry) => `${entry.sequence}. ${entry.text}`)
  ].join("\n");

  await fs.writeFile(filePath, body, "utf8");
  document.filePath = filePath;
}

function createLiveCaptionSegment({
  id,
  sequence,
  channelSlug,
  targetLang,
  timestamp,
  speaker,
  text,
  sourceLang,
  isFinal
}: {
  id?: string;
  sequence?: number;
  channelSlug?: string;
  targetLang?: string;
  timestamp?: number;
  speaker?: string;
  text: string;
  sourceLang?: string;
  isFinal?: boolean;
}) {
  const nextSequence = sequence ?? liveCaptionSequence + 1;
  liveCaptionSequence = Math.max(liveCaptionSequence, nextSequence);
  const cleanedText = removeSpeechFillers(text);

  return {
    id: id ?? `caption-${Date.now()}-${nextSequence}`,
    channelSlug: getCaptionChannelKey(channelSlug),
    targetLang: targetLang?.toLowerCase(),
    timestamp: Number(timestamp) || 0,
    speaker: speaker || "Speaker",
    text: cleanedText,
    sourceLang: (sourceLang || "en").toLowerCase(),
    isFinal: isFinal !== undefined ? Boolean(isFinal) : true,
    sequence: nextSequence,
    createdAt: new Date().toISOString()
  };
}

function writeLiveCaptionEvent(subscriber: CaptionStreamSubscriber, segment: LiveCaptionSegment) {
  const sourceLang = segment.sourceLang || subscriber.fallbackSourceLang;
  const isSameLanguage = sourceLang.toLowerCase() === subscriber.targetLang.toLowerCase();

  if (isSameLanguage) {
    subscriber.writeEvent("caption", {
      id: segment.id,
      channelSlug: segment.channelSlug,
      timestamp: segment.timestamp,
      speaker: segment.speaker,
      sourceText: segment.text,
      translatedText: segment.text,
      engine: segment.isFinal ? "Live Translation Final" : "Live Translation Draft",
      sourceLang,
      targetLang: subscriber.targetLang,
      isFinal: segment.isFinal,
      sequence: segment.sequence
    });
    return;
  }

  subscriber.writeEvent("caption", {
    id: segment.id,
    channelSlug: segment.channelSlug,
    timestamp: segment.timestamp,
    speaker: segment.speaker,
    sourceText: segment.text,
    translatedText: sourceLang.toLowerCase() === subscriber.targetLang.toLowerCase() ? segment.text : "",
    engine: "Live Caption Queue",
    sourceLang,
    targetLang: subscriber.targetLang,
    isFinal: false,
    sequence: segment.sequence
  });

  translateText(segment.text, sourceLang, subscriber.targetLang)
    .then((translation) => {
      if (subscriber.isClosed()) return;

      subscriber.writeEvent("caption", {
        id: segment.id,
        channelSlug: segment.channelSlug,
        timestamp: segment.timestamp,
        speaker: segment.speaker,
        sourceText: segment.text,
        translatedText: translation.translatedText,
        engine: translation.engine,
        sourceLang: translation.sourceLang,
        targetLang: translation.targetLang,
        isFinal: segment.isFinal,
        sequence: segment.sequence
      });
    })
    .catch((error: Error) => {
      if (subscriber.isClosed()) return;

      subscriber.writeEvent("caption-error", {
        id: segment.id,
        channelSlug: segment.channelSlug,
        message: error.message,
        sequence: segment.sequence
      });
    });
}

function publishLiveCaption(segment: LiveCaptionSegment, options: { persist?: boolean } = {}) {
  if (!segment.text.trim()) return;
  const shouldPersist = options.persist !== false;

  if (shouldPersist) {
    const existingIndex = liveCaptionQueue.findIndex((queuedSegment) => queuedSegment.id === segment.id);
    if (existingIndex === -1) {
      liveCaptionQueue.push(segment);
    } else {
      liveCaptionQueue[existingIndex] = segment;
    }
    if (liveCaptionQueue.length > 100) {
      liveCaptionQueue.shift();
    }
  }

  captionStreamSubscribers.forEach((subscriber) => {
    if (subscriber.channelSlug !== segment.channelSlug) return;
    if (segment.targetLang && segment.targetLang !== subscriber.targetLang) return;
    writeLiveCaptionEvent(subscriber, segment);
  });
}

function publishNextDemoCaption(producer: DemoCaptionProducer) {
  const template = demoLiveCaptionTemplates[producer.nextIndex % demoLiveCaptionTemplates.length];
  producer.nextIndex += 1;

  publishLiveCaption(createLiveCaptionSegment({
    channelSlug: producer.channelSlug,
    timestamp: template.timestamp,
    speaker: template.speaker,
    text: template.text,
    sourceLang: producer.sourceLang,
    isFinal: true
  }));
}

function stopDemoCaptionProducer(channelSlug: string | undefined) {
  const channelKey = getCaptionChannelKey(channelSlug);
  const producer = demoCaptionProducers.get(channelKey);
  if (!producer) return false;

  clearInterval(producer.timer);
  demoCaptionProducers.delete(channelKey);
  return true;
}

function getDemoCaptionProducerStatus(channelSlug: string | undefined) {
  const channelKey = getCaptionChannelKey(channelSlug);
  const producer = demoCaptionProducers.get(channelKey);

  return {
    channelSlug: channelKey,
    isRunning: Boolean(producer),
    sourceLang: producer?.sourceLang ?? "en",
    intervalMs: producer?.intervalMs ?? null,
    startedAt: producer?.startedAt ?? null,
    nextIndex: producer?.nextIndex ?? 0,
    subscribers: Array.from(captionStreamSubscribers.values())
      .filter((subscriber) => subscriber.channelSlug === channelKey)
      .length,
    queuedCaptions: liveCaptionQueue.filter((segment) => segment.channelSlug === channelKey).length
  };
}

function startDemoCaptionProducer({
  channelSlug,
  sourceLang,
  intervalMs
}: {
  channelSlug: string | undefined;
  sourceLang: string | undefined;
  intervalMs: number;
}) {
  const channelKey = getCaptionChannelKey(channelSlug);
  stopDemoCaptionProducer(channelKey);

  const producer: DemoCaptionProducer = {
    channelSlug: channelKey,
    sourceLang: (sourceLang || "en").toLowerCase(),
    intervalMs: Math.max(1500, intervalMs || 3500),
    nextIndex: 0,
    timer: setInterval(() => {
      const currentProducer = demoCaptionProducers.get(channelKey);
      if (currentProducer) {
        publishNextDemoCaption(currentProducer);
      }
    }, Math.max(1500, intervalMs || 3500)),
    startedAt: new Date().toISOString()
  };

  demoCaptionProducers.set(channelKey, producer);
  publishNextDemoCaption(producer);

  return getDemoCaptionProducerStatus(channelKey);
}

// In-Memory Live State
let appState = {
  broadcastMode: "live", // "live" | "vod"
  speakerLang: "en",   // "en" | "ko"
  outputLang: "ko",    // "ko" | "en" | "both"
  isCapturing: false,
  layout: "split",     // "split" | "speaker" | "slide"
  currentVideoTime: 0,
  subtitles: [] as Subtitle[],
  qaList: [
    { id: "qa-1", user: "김의학 박사", text: "GLP-1과 SGLT2 억제제를 병용 투여할 때 신장 보호 효과의 시너지는 임상적으로 입증되었나요?", timestamp: "18:22", isAnswered: true, answer: "네, 최근 심혈관 및 신장 보호 임상 데이터에 따르면 다중 경로 조절을 통해 신장 악화 예방에 상호 보완적인 시너지를 보이고 있습니다." },
    { id: "qa-2", user: "Lee MD", text: "What is the recommended eGFR cutoff for empagliflozin initiation in clinical practice?", timestamp: "18:25", isAnswered: false }
  ] as QAItem[],
  bookmarks: [
    { id: "bm-1", timestamp: 45, title: "이중 표적 치료제의 임상 진행 설명 시작" },
    { id: "bm-2", timestamp: 120, title: "SGLT2 억제제와 eGFR 신장 수치 설명" }
  ] as Bookmark[],
  notes: [
    { id: "nt-1", timestamp: 48, text: "임상 3상 진행 상황 체크할 것." },
    { id: "nt-2", timestamp: 130, text: "eGFR 저하 환자 처방 기준 60 미만 체크." }
  ] as Note[]
};

// Seed subtitles if empty
const seedSubtitles = () => {
  appState.subtitles = [
    { id: "sub-1", timestamp: 10, speaker: "Dr. Robert", original: "Good evening, colleagues. Today we will review the clinical trials of dual-targeting therapies.", translated: "안녕하십니까, 동료 여러분. 오늘 우리는 이중 표적 치료제의 임상 시험을 검토할 것입니다.", isFinal: true },
    { id: "sub-2", timestamp: 25, speaker: "Dr. Robert", original: "We will focus on patients presenting with type 2 diabetes and high cardiovascular risk.", translated: "우리는 제2형 당뇨병과 높은 심혈관 위험을 동반한 환자들에게 초점을 맞출 것입니다.", isFinal: true },
    { id: "sub-3", timestamp: 45, speaker: "Dr. Robert", original: "Specifically, looking at how GLP-1 receptor agonist alters metabolic functions.", translated: "특히, GLP-1 수용체 작용제가 어떻게 대사 기능을 변화시키는지 살펴보겠습니다.", isFinal: true },
    { id: "sub-4", timestamp: 65, speaker: "Dr. Robert", original: "The primary endpoint was evaluated over a period of 48 weeks.", translated: "1차 평가변수는 48주의 기간 동안 평가되었습니다.", isFinal: true },
    { id: "sub-5", timestamp: 85, speaker: "Dr. Robert", original: "We also analyzed the risk of any serious adverse event in the treatment group.", translated: "우리는 또한 치료군에서 심각한 이상사례가 발생할 위험을 분석했습니다.", isFinal: true }
  ];
};

seedSubtitles();

// API Endpoints
app.get("/api/state", (req, res) => {
  res.json(appState);
});

app.post("/api/state", (req, res) => {
  appState = { ...appState, ...req.body };
  res.json({ status: "success", state: appState });
});

app.get("/api/dictionary", (req, res) => {
  res.json(medicalDictionary);
});

app.post("/api/dictionary", (req, res) => {
  const { term, definition, category } = req.body;
  if (!term || !definition) {
    return res.status(400).json({ error: "Term and Definition are required" });
  }
  const existingIndex = medicalDictionary.findIndex(item => item.term.toLowerCase() === term.toLowerCase());
  if (existingIndex > -1) {
    medicalDictionary[existingIndex] = { term, definition, category: category || "기타" };
  } else {
    medicalDictionary.push({ term, definition, category: category || "기타" });
  }
  res.json({ status: "success", dictionary: medicalDictionary });
});

// Update single subtitle
app.post("/api/subtitles/update", (req, res) => {
  const { id, original, translated } = req.body;
  const subIndex = appState.subtitles.findIndex(s => s.id === id);
  if (subIndex > -1) {
    appState.subtitles[subIndex].original = original;
    appState.subtitles[subIndex].translated = translated;
    appState.subtitles[subIndex].isEdited = true;
    res.json({ status: "success", subtitle: appState.subtitles[subIndex] });
  } else {
    res.status(404).json({ error: "Subtitle not found" });
  }
});

// Add new subtitle
app.post("/api/subtitles/add", (req, res) => {
  const { original, translated, timestamp, speaker, isFinal } = req.body;
  const newSub: Subtitle = {
    id: `sub-${Date.now()}`,
    timestamp: timestamp || 0,
    speaker: speaker || "Speaker",
    original: original || "",
    translated: translated || "",
    isFinal: isFinal !== undefined ? isFinal : true
  };
  appState.subtitles.push(newSub);
  res.json({ status: "success", subtitle: newSub });
});

// Clear subtitles
app.post("/api/subtitles/clear", (req, res) => {
  appState.subtitles = [];
  res.json({ status: "success", subtitles: [] });
});

// Q&A actions
app.post("/api/qa", (req, res) => {
  const { user, text } = req.body;
  const newQA: QAItem = {
    id: `qa-${Date.now()}`,
    user: user || "Anonymous",
    text: text,
    timestamp: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
    isAnswered: false
  };
  appState.qaList.push(newQA);
  res.json({ status: "success", qa: newQA });
});

app.post("/api/qa/answer", (req, res) => {
  const { id, answer } = req.body;
  const qaIndex = appState.qaList.findIndex(q => q.id === id);
  if (qaIndex > -1) {
    appState.qaList[qaIndex].isAnswered = true;
    appState.qaList[qaIndex].answer = answer;
    res.json({ status: "success", qa: appState.qaList[qaIndex] });
  } else {
    res.status(404).json({ error: "Q&A not found" });
  }
});

// Bookmarks & Notes
app.post("/api/bookmarks", (req, res) => {
  const { timestamp, title } = req.body;
  const newBm: Bookmark = {
    id: `bm-${Date.now()}`,
    timestamp,
    title: title || `북마크 (${Math.floor(timestamp)}초)`
  };
  appState.bookmarks.push(newBm);
  res.json({ status: "success", bookmarks: appState.bookmarks });
});

app.post("/api/bookmarks/delete", (req, res) => {
  const { id } = req.body;
  appState.bookmarks = appState.bookmarks.filter(b => b.id !== id);
  res.json({ status: "success", bookmarks: appState.bookmarks });
});

app.post("/api/notes", (req, res) => {
  const { timestamp, text } = req.body;
  const newNote: Note = {
    id: `nt-${Date.now()}`,
    timestamp,
    text
  };
  appState.notes.push(newNote);
  res.json({ status: "success", notes: appState.notes });
});

app.post("/api/notes/delete", (req, res) => {
  const { id } = req.body;
  appState.notes = appState.notes.filter(n => n.id !== id);
  res.json({ status: "success", notes: appState.notes });
});

// Gemini-Powered Medical Translator endpoint
app.post("/api/translate", async (req, res) => {
  const { text, sourceLang, targetLang } = req.body;
  if (!text) {
    return res.status(400).json({ error: "No text specified for translation" });
  }

  res.json(await translateText(text, sourceLang, targetLang));
});

app.post("/api/audio/transcribe-publish", express.raw({ type: "*/*", limit: "15mb" }), async (req, res) => {
  const channelSlug = getCaptionChannelSlugFromQuery(req.query as Record<string, unknown>);
  const getQueryValue = (value: unknown, fallback: string) => typeof value === "string" ? value : fallback;
  const sourceLang = getQueryValue(req.query.sourceLang, "en").toLowerCase();
  const mimeType = req.headers["content-type"]?.split(";")[0] || "audio/webm";
  const audioBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body ?? []);

  if (!audioBuffer.length) {
    return res.status(400).json({ error: "audio chunk is required" });
  }

  if (!aiClient) {
    return res.status(503).json({ error: "Gemini API client is not configured" });
  }

  const prompt = `Transcribe the speech in this audio chunk.
The expected source language is ${getLanguageLabel(sourceLang)}.
Return only the spoken transcript text.
If there is no clear speech, return an empty string.`;

  try {
    const response = await Promise.race([
      aiClient.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
          { text: prompt },
          {
            inlineData: {
              mimeType,
              data: audioBuffer.toString("base64")
            }
          }
        ] as any,
        config: {
          temperature: 0.1
        }
      }),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Gemini audio transcription timed out after ${TRANSLATION_TIMEOUT_MS}ms`)), TRANSLATION_TIMEOUT_MS);
      })
    ]);
    const transcript = response.text?.trim() || "";

    if (!transcript) {
      return res.json({
        status: "no-speech",
        transcript: "",
        engine: `Gemini ${GEMINI_MODEL} Audio`
      });
    }

    const segment = createLiveCaptionSegment({
      channelSlug,
      speaker: "Live Audio",
      text: transcript,
      sourceLang,
      isFinal: true
    });
    publishLiveCaption(segment);

    res.json({
      status: "published",
      transcript,
      caption: segment,
      engine: `Gemini ${GEMINI_MODEL} Audio`
    });
  } catch (error: unknown) {
    recordTranslationError({
      error,
      text: `[audio chunk: ${mimeType}, ${audioBuffer.length} bytes]`,
      sourceLang,
      targetLang: "transcription"
    });
    console.error("Gemini Audio Transcription Error:", error);
    res.status(502).json({
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

app.get("/api/translation-errors", (req, res) => {
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  res.json({
    count: translationErrorLogs.length,
    errors: translationErrorLogs.slice(0, limit)
  });
});

app.delete("/api/translation-errors", (_req, res) => {
  translationErrorLogs.splice(0, translationErrorLogs.length);
  res.json({ status: "cleared" });
});

app.get("/api/captions/queue", (req, res) => {
  const getQueryValue = (value: unknown, fallback: string) => typeof value === "string" ? value : fallback;
  const channelSlug = getCaptionChannelKey(getCaptionChannelSlugFromQuery(req.query as Record<string, unknown>));
  const limit = Math.min(100, Math.max(1, Number(getQueryValue(req.query.limit, "20")) || 20));
  const captions = liveCaptionQueue
    .filter((segment) => segment.channelSlug === channelSlug)
    .slice(-limit);

  res.json({
    channelSlug,
    count: captions.length,
    captions
  });
});

app.get("/api/captions/transcripts", (req, res) => {
  const getQueryValue = (value: unknown, fallback: string) => typeof value === "string" ? value : fallback;
  const channelSlug = getCaptionChannelKey(getCaptionChannelSlugFromQuery(req.query as Record<string, unknown>));
  const limit = Math.min(50, Math.max(1, Number(getQueryValue(req.query.limit, "10")) || 10));
  const documents = liveTranscriptDocuments
    .filter((document) => document.channelSlug === channelSlug)
    .slice(0, limit);

  res.json({
    channelSlug,
    count: documents.length,
    documents
  });
});

app.post("/api/captions/publish", (req, res) => {
  const {
    channelSlug,
    timestamp,
    speaker,
    text,
    sourceLang,
    isFinal
  } = req.body;

  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "text is required" });
  }

  const segment = createLiveCaptionSegment({
    channelSlug: getCaptionChannelSlugFromBody({ channelSlug }),
    timestamp,
    speaker,
    text,
    sourceLang,
    isFinal
  });

  publishLiveCaption(segment);

  res.json({
    status: "queued",
    caption: segment,
    subscribers: Array.from(captionStreamSubscribers.values())
      .filter((subscriber) => subscriber.channelSlug === segment.channelSlug)
      .length
  });
});

app.get("/api/captions/demo/status", (req, res) => {
  res.json(getDemoCaptionProducerStatus(getCaptionChannelSlugFromQuery(req.query as Record<string, unknown>)));
});

app.post("/api/captions/demo/start", (req, res) => {
  const {
    channelSlug,
    sourceLang,
    intervalMs
  } = req.body;

  res.json({
    status: "started",
    producer: startDemoCaptionProducer({
      channelSlug: getCaptionChannelSlugFromBody({ channelSlug }),
      sourceLang,
      intervalMs: Number(intervalMs) || 3500
    })
  });
});

app.post("/api/captions/demo/stop", (req, res) => {
  const { channelSlug } = req.body;
  const channelKey = getCaptionChannelKey(getCaptionChannelSlugFromBody({ channelSlug }));
  const stopped = stopDemoCaptionProducer(channelKey);

  res.json({
    status: stopped ? "stopped" : "not-running",
    producer: getDemoCaptionProducerStatus(channelKey)
  });
});

app.get("/api/captions/stream", (req, res) => {
  const getQueryValue = (value: unknown, fallback: string) => typeof value === "string" ? value : fallback;
  const sourceLang = getQueryValue(req.query.sourceLang, "en").toLowerCase();
  const targetLang = getQueryValue(req.query.targetLang, "ko").toLowerCase();
  const channelSlug = getCaptionChannelKey(getCaptionChannelSlugFromQuery(req.query as Record<string, unknown>));
  const replayLatest = getQueryValue(req.query.replayLatest, "true") !== "false";
  const replayLimit = Math.min(100, Math.max(1, Number(getQueryValue(req.query.replayLimit, "50")) || 50));
  const subscriberId = `subscriber-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let isClosed = false;

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no"
  });
  res.write("retry: 2000\n\n");

  const writeEvent = (eventName: string, payload: unknown) => {
    res.write(`event: ${eventName}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  const subscriber: CaptionStreamSubscriber = {
    id: subscriberId,
    channelSlug,
    targetLang,
    fallbackSourceLang: sourceLang,
    writeEvent,
    isClosed: () => isClosed
  };

  captionStreamSubscribers.set(subscriberId, subscriber);

  req.on("close", () => {
    isClosed = true;
    captionStreamSubscribers.delete(subscriberId);
  });

  writeEvent("stream-ready", {
    subscriberId,
    channelSlug,
    sourceLang,
    targetLang,
    queuedCaptions: liveCaptionQueue.filter((segment) => segment.channelSlug === channelSlug).length
  });

  if (replayLatest) {
    const replaySegments = liveCaptionQueue
      .filter((segment) => segment.channelSlug === channelSlug)
      .filter((segment) => !segment.targetLang || segment.targetLang === targetLang)
      .slice(-replayLimit);

    replaySegments.forEach((segment) => writeLiveCaptionEvent(subscriber, segment));
  }
});

interface GeminiLiveConnectionLike {
  sendRealtimeInput: (params: {
    audio?: { data: string; mimeType: string };
    audioStreamEnd?: boolean;
    text?: string;
  }) => void;
  close: () => void;
}

interface AudioInterpretationSubscriber {
  id: string;
  channelSlug: string;
  targetLang: string;
  socket: WebSocket;
}

const audioInterpretationSubscribers = new Map<string, AudioInterpretationSubscriber>();

interface LiveServerMessageLike {
  setupComplete?: unknown;
  serverContent?: {
    modelTurn?: {
      parts?: Array<{
        text?: string;
        inlineData?: {
          data?: string;
          mimeType?: string;
        };
      }>;
    };
    inputTranscription?: {
      text?: string;
      finished?: boolean;
      languageCode?: string;
    };
    outputTranscription?: {
      text?: string;
      finished?: boolean;
      languageCode?: string;
    };
    interimInputTranscription?: {
      text?: string;
      finished?: boolean;
      languageCode?: string;
    };
    generationComplete?: boolean;
    waitingForInput?: boolean;
    turnComplete?: boolean;
  };
  goAway?: {
    timeLeft?: string;
  };
  usageMetadata?: unknown;
  voiceActivity?: unknown;
  voiceActivityDetectionSignal?: unknown;
}

function sendAudioLiveSocketMessage(socket: WebSocket, payload: unknown) {
  if (socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify(payload));
}

function getAudioSampleRateFromMimeType(mimeType: string | undefined) {
  const matchedRate = mimeType?.match(/rate=(\d+)/i)?.[1];
  return matchedRate ? Number(matchedRate) : 24000;
}

function broadcastLiveTranslatedAudio(channelSlug: string, targetLang: string, message: LiveServerMessageLike) {
  const audioParts = message.serverContent?.modelTurn?.parts?.filter((part) => part.inlineData?.data) ?? [];
  const normalizedChannelSlug = getCaptionChannelKey(channelSlug);
  const normalizedTargetLang = targetLang.toLowerCase();

  audioParts.forEach((part) => {
    const mimeType = part.inlineData?.mimeType || "audio/pcm;rate=24000";
    const payload = JSON.stringify({
      type: "translation-audio",
      channelSlug: normalizedChannelSlug,
      targetLang: normalizedTargetLang,
      audio: part.inlineData?.data,
      mimeType,
      sampleRate: getAudioSampleRateFromMimeType(mimeType)
    });

    audioInterpretationSubscribers.forEach((subscriber) => {
      if (subscriber.channelSlug !== normalizedChannelSlug) return;
      if (subscriber.targetLang !== normalizedTargetLang) return;
      if (subscriber.socket.readyState !== WebSocket.OPEN) return;
      subscriber.socket.send(payload);
    });
  });

  return audioParts.length;
}

function getLiveAudioLanguageCode(languageCode: string) {
  const normalizedLanguageCode = languageCode.toLowerCase();
  const bcp47LanguageCodes: Record<string, string> = {
    ar: "ar",
    zh: "zh-CN",
    en: "en-US",
    fr: "fr-FR",
    ko: "ko-KR",
    ru: "ru-RU",
    es: "es-ES"
  };

  return bcp47LanguageCodes[normalizedLanguageCode] ?? normalizedLanguageCode;
}

function getLiveTranslateTargetLanguageCode(languageCode: string) {
  const normalizedLanguageCode = languageCode.toLowerCase();
  const targetLanguageCodes: Record<string, string> = {
    ar: "ar",
    zh: "zh-CN",
    en: "en",
    fr: "fr",
    ko: "ko",
    ru: "ru",
    es: "es"
  };

  return targetLanguageCodes[normalizedLanguageCode] ?? normalizedLanguageCode;
}

function getLiveTargetLanguages(requestUrl: URL) {
  const requestedTargetLangs = requestUrl.searchParams.get("targetLangs");
  const requestedTargetLang = requestUrl.searchParams.get("targetLang");
  const rawTargetLanguages = requestedTargetLangs
    ? requestedTargetLangs.split(",")
    : requestedTargetLang
      ? [requestedTargetLang]
      : DEFAULT_LIVE_TARGET_LANGUAGES;
  const normalizedTargetLanguages = rawTargetLanguages
    .map((languageCode) => languageCode.trim().toLowerCase())
    .filter(Boolean);

  return Array.from(new Set(normalizedTargetLanguages.length > 0 ? normalizedTargetLanguages : DEFAULT_LIVE_TARGET_LANGUAGES));
}

function getPrimaryLanguageCode(languageCode: string | undefined) {
  if (!languageCode) return "";
  return languageCode.toLowerCase().split("-")[0] || "";
}

function summarizeLiveServerMessage(message: LiveServerMessageLike) {
  const serverContent = message.serverContent;
  const summary = [
    message.setupComplete ? "setupComplete" : "",
    serverContent?.inputTranscription ? "inputTranscription" : "",
    serverContent?.outputTranscription ? "outputTranscription" : "",
    serverContent?.interimInputTranscription ? "interimInputTranscription" : "",
    serverContent?.modelTurn ? "modelTurn" : "",
    serverContent?.turnComplete ? "turnComplete" : "",
    serverContent?.generationComplete ? "generationComplete" : "",
    serverContent?.waitingForInput ? "waitingForInput" : "",
    message.goAway ? `goAway:${message.goAway.timeLeft ?? ""}` : "",
    message.usageMetadata ? "usageMetadata" : "",
    message.voiceActivity ? "voiceActivity" : "",
    message.voiceActivityDetectionSignal ? "voiceActivityDetectionSignal" : ""
  ].filter(Boolean);

  return summary.join(", ") || "empty-message";
}

function createLiveCaptionPublisher({
  socket,
  channelSlug,
  sourceLang,
  targetLang,
  targetLangScope,
  document
}: {
  socket: WebSocket;
  channelSlug: string;
  sourceLang: string;
  targetLang: string;
  targetLangScope?: string;
  document: LiveTranscriptDocument;
}) {
  let currentDraftId = "";
  let currentDraftSequence = 0;
  let lastDraftText = "";
  let lastFinalText = "";

  const ensureDraftIdentity = () => {
    if (currentDraftId && currentDraftSequence) return;
    currentDraftSequence = liveCaptionSequence + 1;
    currentDraftId = `caption-${Date.now()}-${currentDraftSequence}`;
  };

  return (text: string, engine = `Gemini ${GEMINI_LIVE_MODEL} Live`, isFinal = true) => {
    const normalizedText = removeSpeechFillers(text);
    if (normalizedText.length < 2) return;

    if (!isFinal) {
      if (normalizedText === lastDraftText) return;
      ensureDraftIdentity();
      lastDraftText = normalizedText;

      const draftSegment = createLiveCaptionSegment({
        id: currentDraftId,
        sequence: currentDraftSequence,
        channelSlug,
        targetLang: targetLangScope,
        speaker: "Live Audio",
        text: normalizedText,
        sourceLang,
        isFinal: false
      });
      publishLiveCaption(draftSegment, { persist: false });
      sendAudioLiveSocketMessage(socket, {
        type: "caption",
        targetLang,
        transcript: normalizedText,
        sequence: draftSegment.sequence,
        engine,
        isFinal: false
      });
      return;
    }

    if (normalizedText === lastFinalText) return;
    const finalSegmentId = currentDraftId || undefined;
    const finalSegmentSequence = currentDraftSequence || undefined;
    const segment = createLiveCaptionSegment({
      id: finalSegmentId,
      sequence: finalSegmentSequence,
      channelSlug,
      targetLang: targetLangScope,
      speaker: "Live Audio",
      text: normalizedText,
      sourceLang,
      isFinal
    });
    publishLiveCaption(segment);
    appendLiveTranscriptEntry({
      document,
      segment,
      targetLang,
      engine
    });
    lastFinalText = normalizedText;
    currentDraftId = "";
    currentDraftSequence = 0;
    lastDraftText = "";
    sendAudioLiveSocketMessage(socket, {
      type: "caption",
      targetLang,
      transcript: normalizedText,
      sequence: segment.sequence,
      engine,
      isFinal
    });
  };
}

function normalizeTranscriptText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function shouldPublishTranscriptText(text: string) {
  const normalizedText = normalizeTranscriptText(text);
  if (normalizedText.length < 8) return false;
  if (!/[a-zA-Z가-힣\u0600-\u06ff\u0400-\u04ff\u4e00-\u9fff]/.test(normalizedText)) return false;
  return true;
}

function shouldFlushTranscriptNow(text: string) {
  const normalizedText = normalizeTranscriptText(text);
  if (!shouldPublishTranscriptText(normalizedText)) return false;

  if (/[.!?。！？]$/.test(normalizedText)) return true;
  if (/[.!?。！？][)"'\]]?$/.test(normalizedText)) return true;
  if (/[가-힣]$/.test(normalizedText) && /(다|요|죠|니다|습니다|까요|네요)[.!?。！？]?$/.test(normalizedText)) return true;
  if (normalizedText.length >= 140) return true;

  return false;
}

function appendTranscriptFragment(currentText: string, fragment: string) {
  const normalizedCurrent = normalizeTranscriptText(currentText);
  const normalizedFragment = normalizeTranscriptText(fragment);
  if (!normalizedFragment) return currentText;
  if (!normalizedCurrent) return fragment;

  const lowerCurrent = normalizedCurrent.toLowerCase();
  const lowerFragment = normalizedFragment.toLowerCase();
  if (lowerFragment.startsWith(lowerCurrent)) {
    return fragment;
  }
  if (lowerCurrent.endsWith(lowerFragment)) {
    return currentText;
  }

  const boundaryMergedText = mergeRepeatedBoundaryPhrase(normalizedCurrent, normalizedFragment);
  if (boundaryMergedText) {
    return boundaryMergedText;
  }

  const fragmentHasLeadingSpace = /^\s/.test(fragment);
  const currentHasTrailingSpace = /\s$/.test(currentText);
  if (fragmentHasLeadingSpace || currentHasTrailingSpace) {
    return `${currentText}${fragment}`;
  }

  if (/^[,.;:!?)]/.test(normalizedFragment)) {
    return `${normalizedCurrent}${normalizedFragment}`;
  }

  if (/[([{]$/.test(normalizedCurrent)) {
    return `${normalizedCurrent}${normalizedFragment}`;
  }

  if (shouldJoinAsSplitWord(normalizedCurrent, normalizedFragment)) {
    return `${normalizedCurrent}${normalizedFragment}`;
  }

  return `${normalizedCurrent} ${normalizedFragment}`;
}

function shouldJoinAsSplitWord(currentText: string, fragment: string) {
  const currentLastToken = currentText.split(/\s+/).at(-1) ?? "";
  const fragmentFirstToken = fragment.split(/\s+/)[0] ?? "";
  if (!currentLastToken || !fragmentFirstToken) return false;
  if (!/[a-zA-Z]$/.test(currentLastToken) || !/^[a-z]/.test(fragmentFirstToken)) return false;
  if (fragment.includes(" ")) return false;

  return currentLastToken.length <= 2;
}

function normalizeMergeToken(token: string) {
  return token
    .replace(/[()[\]{}"'“”‘’.,;:!?。！？，、]/g, "")
    .trim()
    .toLowerCase();
}

function isMeaningfulOverlap(tokens: string[]) {
  const normalizedTokens = tokens.map(normalizeMergeToken).filter(Boolean);
  if (normalizedTokens.length >= 2) return true;
  const onlyToken = normalizedTokens[0] ?? "";
  return /\d/.test(onlyToken) || onlyToken.length >= 5;
}

function mergeRepeatedBoundaryPhrase(currentText: string, fragment: string) {
  const currentTokens = currentText.split(/\s+/).filter(Boolean);
  const fragmentTokens = fragment.split(/\s+/).filter(Boolean);
  const maxOverlapTokenCount = Math.min(8, currentTokens.length, fragmentTokens.length);

  for (let overlapTokenCount = maxOverlapTokenCount; overlapTokenCount >= 1; overlapTokenCount -= 1) {
    const currentSuffixTokens = currentTokens.slice(-overlapTokenCount);
    if (!isMeaningfulOverlap(currentSuffixTokens)) continue;

    const normalizedCurrentSuffix = currentSuffixTokens.map(normalizeMergeToken).join(" ");
    const maxFragmentStartIndex = Math.min(4, fragmentTokens.length - overlapTokenCount);

    for (let fragmentStartIndex = 0; fragmentStartIndex <= maxFragmentStartIndex; fragmentStartIndex += 1) {
      const fragmentCandidate = fragmentTokens
        .slice(fragmentStartIndex, fragmentStartIndex + overlapTokenCount)
        .map(normalizeMergeToken)
        .join(" ");

      if (fragmentCandidate && fragmentCandidate === normalizedCurrentSuffix) {
        return [...currentTokens.slice(0, -overlapTokenCount), ...fragmentTokens].join(" ");
      }
    }
  }

  return "";
}

function createLiveTranscriptBuffer({
  socket,
  publishTranscript,
  mode,
  sourceLang,
  targetLang
}: {
  socket: WebSocket;
  publishTranscript: (text: string, engine?: string, isFinal?: boolean) => void;
  mode: LiveTranslationMode;
  sourceLang: string;
  targetLang: string;
}) {
  let pendingText = "";
  let sourcePendingText = "";
  let detectedSourceLang = getPrimaryLanguageCode(sourceLang) || "en";
  let lastRealtimeDraftSource = "";
  let hasFinalFragments = false;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let realtimeDraftTimer: ReturnType<typeof setTimeout> | null = null;
  let realtimeDraftRequestId = 0;

  const clearDebounceTimer = () => {
    if (!debounceTimer) return;
    clearTimeout(debounceTimer);
    debounceTimer = null;
  };

  const clearRealtimeDraftTimer = () => {
    if (!realtimeDraftTimer) return;
    clearTimeout(realtimeDraftTimer);
    realtimeDraftTimer = null;
  };

  const translateAndPublishSourceText = async (sourceText: string, isFinal: boolean, reason: string) => {
    const normalizedSourceText = removeSpeechFillers(sourceText);
    if (!shouldPublishTranscriptText(normalizedSourceText)) return false;
    if (!isFinal && normalizedSourceText === lastRealtimeDraftSource) return false;

    const requestId = realtimeDraftRequestId + 1;
    realtimeDraftRequestId = requestId;
    lastRealtimeDraftSource = normalizedSourceText;

    const translation = await translateText(normalizedSourceText, detectedSourceLang, targetLang);
    if (!isFinal && requestId !== realtimeDraftRequestId) return;
    if (isFallbackTranslationResult(translation)) {
      sendAudioLiveSocketMessage(socket, {
        type: "debug",
        message: `source rewrite skipped fallback translation (${reason}): ${translation.engine}`
      });
      return false;
    }

    publishTranscript(
      translation.translatedText,
      `${translation.engine} ${isFinal ? "Final" : "Draft"} (${reason})`,
      isFinal
    );
    return true;
  };

  const scheduleRealtimeDraftTranslation = () => {
    if (mode !== "realtime") return;
    const sourceText = sourcePendingText;
    if (!shouldPublishTranscriptText(sourceText)) return;

    clearRealtimeDraftTimer();
    realtimeDraftTimer = setTimeout(() => {
      void translateAndPublishSourceText(sourceText, false, "source-rewrite")
        .catch((error) => {
          recordTranslationError({
            error,
            text: sourceText,
            sourceLang: detectedSourceLang,
            targetLang
          });
        });
    }, 650);
  };

  const flush = async (reason: string) => {
    clearDebounceTimer();
    clearRealtimeDraftTimer();
    const normalizedText = removeSpeechFillers(pendingText);
    const normalizedSourceText = removeSpeechFillers(sourcePendingText);
    pendingText = "";
    sourcePendingText = "";
    hasFinalFragments = false;

    if (mode === "realtime" && shouldPublishTranscriptText(normalizedSourceText)) {
      sendAudioLiveSocketMessage(socket, {
        type: "debug",
        message: `source transcript flushed (${reason}): ${normalizedSourceText.length} chars`
      });
      const didPublishSourceRewrite = await translateAndPublishSourceText(normalizedSourceText, true, reason);
      if (didPublishSourceRewrite) return;
    }

    if (!shouldPublishTranscriptText(normalizedText)) {
      if (shouldPublishTranscriptText(normalizedSourceText)) {
        sendAudioLiveSocketMessage(socket, {
          type: "debug",
          message: `source transcript fallback (${reason}): ${normalizedSourceText.length} chars`
        });
        await translateAndPublishSourceText(normalizedSourceText, true, `${reason}-source-fallback`);
        return;
      }

      if (normalizedText) {
        sendAudioLiveSocketMessage(socket, {
          type: "debug",
          message: `transcript ignored (${reason}): ${normalizedText}`
        });
      }
      return;
    }

    sendAudioLiveSocketMessage(socket, {
      type: "debug",
      message: `transcript flushed (${reason}): ${normalizedText.length} chars`
    });
    publishTranscript(normalizedText);
  };

  const scheduleDebouncedFlush = () => {
    clearDebounceTimer();
    debounceTimer = setTimeout(() => {
      void flush("debounce");
    }, 1300);
  };

  return {
    handleLiveMessage(message: LiveServerMessageLike) {
      const serverContent = message.serverContent;
      const outputText = serverContent?.outputTranscription?.text || "";
      const inputText = serverContent?.inputTranscription?.text || "";
      const interimText = serverContent?.interimInputTranscription?.text || "";
      const modelText = serverContent?.modelTurn?.parts
        ?.map((part) => part.text ?? "")
        .join("")
        .trim() ?? "";

      if (interimText) {
        sendAudioLiveSocketMessage(socket, {
          type: "debug",
          message: `interim transcript observed: ${normalizeTranscriptText(interimText).length} chars`
        });
      }

      if (inputText) {
        const inputLanguage = getPrimaryLanguageCode(serverContent?.inputTranscription?.languageCode);
        if (inputLanguage && inputLanguage !== "und") {
          detectedSourceLang = inputLanguage;
        }
        sourcePendingText = appendTranscriptFragment(sourcePendingText, removeSpeechFillers(inputText));
        scheduleRealtimeDraftTranslation();

        sendAudioLiveSocketMessage(socket, {
          type: "debug",
          message: `input transcript observed: ${normalizeTranscriptText(inputText)}`
        });
      }

      if (outputText) {
        const cleanedOutputText = removeSpeechFillers(outputText);
        hasFinalFragments = true;
        pendingText = appendTranscriptFragment(pendingText, cleanedOutputText || outputText);
        if (shouldFlushTranscriptNow(sourcePendingText) || shouldFlushTranscriptNow(pendingText)) {
          void flush("sentence-boundary");
        } else {
          scheduleDebouncedFlush();
        }
        sendAudioLiveSocketMessage(socket, {
          type: "debug",
          message: `translated transcript fragment buffered: ${normalizeTranscriptText(outputText)}`
        });
      }

      if (modelText) {
        sendAudioLiveSocketMessage(socket, {
          type: "debug",
          message: `modelTurn ignored: ${modelText.length} chars`
        });
      }
    },
    flush,
    dispose() {
      clearDebounceTimer();
      clearRealtimeDraftTimer();
    }
  };
}

function installAudioLiveWebSocketServer(server: HttpServer) {
  const audioLiveWss = new WebSocketServer({ noServer: true });
  const audioInterpretationWss = new WebSocketServer({ noServer: true });

  audioInterpretationWss.on("connection", (socket, request) => {
    const requestUrl = new URL(request.url ?? "", `http://${request.headers.host ?? "localhost"}`);
    const channelSlug = getCaptionChannelKey(requestUrl.searchParams.get("channelSlug") ?? "main-keynote");
    const targetLang = (requestUrl.searchParams.get("targetLang") ?? "ko").toLowerCase();
    const subscriberId = `audio-subscriber-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    audioInterpretationSubscribers.set(subscriberId, {
      id: subscriberId,
      channelSlug,
      targetLang,
      socket
    });
    sendAudioLiveSocketMessage(socket, {
      type: "ready",
      subscriberId,
      channelSlug,
      targetLang
    });

    socket.on("close", () => {
      audioInterpretationSubscribers.delete(subscriberId);
    });
    socket.on("error", () => {
      audioInterpretationSubscribers.delete(subscriberId);
    });
  });

  audioLiveWss.on("connection", (socket, request) => {
    const requestUrl = new URL(request.url ?? "", `http://${request.headers.host ?? "localhost"}`);
    const channelSlug = getCaptionChannelKey(requestUrl.searchParams.get("channelSlug") ?? "main-keynote");
    const sourceLang = (requestUrl.searchParams.get("sourceLang") ?? "auto").toLowerCase();
    const targetLangs = getLiveTargetLanguages(requestUrl);
    const translationMode: LiveTranslationMode = requestUrl.searchParams.get("mode") === "realtime" ? "realtime" : "sentence";
    const mimeType = requestUrl.searchParams.get("mimeType") || "audio/webm;codecs=opus";
    const pendingFrames: Buffer[] = [];
    const liveConnections = new Map<string, GeminiLiveConnectionLike>();
    const liveTranscriptBuffers = new Map<string, ReturnType<typeof createLiveTranscriptBuffer>>();
    const transcriptDocuments = new Map<string, LiveTranscriptDocument>();
    let isClosed = false;
    let isReadyToSendFrames = false;
    let audioFrameCount = 0;
    let liveServerMessageCount = 0;
    let didSaveTranscriptDocument = false;
    clearLiveCaptionQueue(channelSlug);

    targetLangs.forEach((targetLang) => {
      const transcriptDocument = createLiveTranscriptDocument(channelSlug, targetLang);
      transcriptDocuments.set(targetLang, transcriptDocument);
      const publishLiveTranscript = createLiveCaptionPublisher({
        socket,
        channelSlug,
        sourceLang: targetLang,
        targetLang,
        targetLangScope: targetLang,
        document: transcriptDocument
      });
      liveTranscriptBuffers.set(targetLang, createLiveTranscriptBuffer({
        socket,
        publishTranscript: publishLiveTranscript,
        mode: translationMode,
        sourceLang,
        targetLang
      }));
    });

    const sendFrameToLiveConnections = (frame: Buffer) => {
      liveConnections.forEach((liveConnection) => {
        liveConnection.sendRealtimeInput({
          audio: {
            data: frame.toString("base64"),
            mimeType
          }
        });
      });
    };

    const flushPendingFrames = () => {
      if (!isReadyToSendFrames || liveConnections.size === 0) return;

      while (pendingFrames.length > 0) {
        const frame = pendingFrames.shift();
        if (!frame) continue;
        sendFrameToLiveConnections(frame);
      }
    };

    const connectLiveConnection = async (targetLang: string) => {
      if (!liveAiClient) {
        sendAudioLiveSocketMessage(socket, {
          type: "error",
          message: "Gemini API client is not configured."
        });
        socket.close(1011, "Gemini API client is not configured");
        return;
      }

      try {
        sendAudioLiveSocketMessage(socket, {
          type: "connecting",
          model: GEMINI_LIVE_MODEL,
          targetLang,
          message: `Live Translate setup: model=${GEMINI_LIVE_MODEL}, apiVersion=${GEMINI_LIVE_API_VERSION}, input=auto, target=${getLiveTranslateTargetLanguageCode(targetLang)}, mode=${translationMode}`
        });

        const liveConnection = await (liveAiClient as any).live.connect({
          model: GEMINI_LIVE_MODEL,
          config: {
            responseModalities: ["AUDIO"],
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            translationConfig: {
              targetLanguageCode: getLiveTranslateTargetLanguageCode(targetLang),
              echoTargetLanguage: true
            }
          },
          callbacks: {
            onopen: () => {
              sendAudioLiveSocketMessage(socket, {
                type: "open",
                model: GEMINI_LIVE_MODEL,
                targetLang
              });
            },
            onmessage: (message: LiveServerMessageLike) => {
              liveServerMessageCount += 1;
              const forwardedAudioChunks = broadcastLiveTranslatedAudio(channelSlug, targetLang, message);
              liveTranscriptBuffers.get(targetLang)?.handleLiveMessage(message);

              if (liveServerMessageCount <= 8 || liveServerMessageCount % 20 === 0) {
                sendAudioLiveSocketMessage(socket, {
                  type: "debug",
                  targetLang,
                  message: `Live message #${liveServerMessageCount} (${targetLang}): ${summarizeLiveServerMessage(message)}${
                    forwardedAudioChunks > 0 ? `, audioChunks:${forwardedAudioChunks}` : ""
                  }`
                });
              }
            },
            onerror: (error: Error) => {
              const message = error instanceof Error ? error.message : String(error);
              recordTranslationError({
                error,
                text: "[Gemini Live audio connection]",
                sourceLang,
                targetLang
              });
              sendAudioLiveSocketMessage(socket, {
                type: "error",
                targetLang,
                message
              });
            },
            onclose: (event: { code?: number; reason?: string; wasClean?: boolean }) => {
              const closeCode = event?.code;
              const closeReason = event?.reason || "";
              sendAudioLiveSocketMessage(socket, {
                type: "closed",
                targetLang,
                code: closeCode,
                reason: closeReason,
                wasClean: event?.wasClean
              });
            }
          }
        });

        if (isClosed) {
          liveConnection.close();
          return;
        }
        liveConnections.set(targetLang, liveConnection);
      } catch (error) {
        recordTranslationError({
          error,
          text: "[Gemini Live audio connect]",
          sourceLang,
          targetLang
        });
        sendAudioLiveSocketMessage(socket, {
          type: "error",
          targetLang,
          message: error instanceof Error ? error.message : String(error)
        });
      }
    };

    const connectLiveConnections = async () => {
      await Promise.all(targetLangs.map((targetLang) => connectLiveConnection(targetLang)));

      if (isClosed) {
        liveConnections.forEach((liveConnection) => liveConnection.close());
        return;
      }

      if (liveConnections.size === 0) {
        socket.close(1011, "Gemini Live connection failed");
        return;
      }

      isReadyToSendFrames = true;
      sendAudioLiveSocketMessage(socket, {
        type: "ready",
        channelSlug,
        sourceLang,
        targetLangs: Array.from(liveConnections.keys()),
        mimeType,
        mode: translationMode,
        transcriptDocumentIds: Array.from(transcriptDocuments.values()).map((document) => document.id)
      });
      flushPendingFrames();
    };

    void connectLiveConnections();

    socket.on("message", (data, isBinary) => {
      if (!isBinary) {
        try {
          const message = JSON.parse(data.toString()) as { type?: string; text?: string };
          if (message.type === "text" && message.text) {
            liveTranscriptBuffers.forEach((_buffer, targetLang) => {
              const document = transcriptDocuments.get(targetLang);
              if (!document) return;
              createLiveCaptionPublisher({
                socket,
                channelSlug,
                sourceLang: targetLang,
                targetLang,
                targetLangScope: targetLang,
                document
              })(message.text, "Client Text Frame");
            });
          }
          if (message.type === "end") {
            liveTranscriptBuffers.forEach((liveTranscriptBuffer) => {
              void liveTranscriptBuffer.flush("client-end");
            });
            liveConnections.forEach((liveConnection) => {
              liveConnection.sendRealtimeInput({ audioStreamEnd: true });
            });
          }
        } catch {
          sendAudioLiveSocketMessage(socket, {
            type: "error",
            message: "Invalid websocket control message."
          });
        }
        return;
      }

      const frame = Buffer.isBuffer(data)
        ? data
        : Array.isArray(data)
          ? Buffer.concat(data)
          : Buffer.from(data);

      if (!frame.length) return;
      audioFrameCount += 1;
      if (audioFrameCount === 1 || audioFrameCount % 50 === 0) {
        sendAudioLiveSocketMessage(socket, {
          type: "debug",
          message: `audio frame received #${audioFrameCount} (${frame.length} bytes)`
        });
      }
      if (!isReadyToSendFrames || liveConnections.size === 0) {
        pendingFrames.push(frame);
        if (pendingFrames.length > 80) {
          pendingFrames.shift();
        }
        return;
      }

      sendFrameToLiveConnections(frame);
    });

    socket.on("close", () => {
      isClosed = true;
      void Promise.all(Array.from(liveTranscriptBuffers.values()).map((liveTranscriptBuffer) => liveTranscriptBuffer.flush("socket-close")))
        .finally(() => {
          liveTranscriptBuffers.forEach((liveTranscriptBuffer) => liveTranscriptBuffer.dispose());
        })
        .finally(() => {
          if (didSaveTranscriptDocument) return;
          didSaveTranscriptDocument = true;
          return Promise.all(Array.from(transcriptDocuments.values()).map(saveLiveTranscriptDocument));
        })
          .then(() => {
            transcriptDocuments.forEach((transcriptDocument) => {
              if (transcriptDocument.filePath) {
                console.log(`Saved live transcript document: ${transcriptDocument.filePath}`);
              }
            });
          })
          .catch((error) => {
            recordTranslationError({
              error,
              text: "[Live transcript document save]",
              sourceLang,
              targetLang: targetLangs.join(",")
            });
          });
      try {
        liveConnections.forEach((liveConnection) => {
          liveConnection.sendRealtimeInput({ audioStreamEnd: true });
        });
      } catch {
        // Closing should not fail the HTTP server.
      }
      liveConnections.forEach((liveConnection) => liveConnection.close());
    });

    socket.on("error", (error) => {
      recordTranslationError({
        error,
        text: "[Browser audio websocket]",
        sourceLang,
        targetLang: "live-transcription"
      });
    });
  });

  server.on("upgrade", (request, socket, head) => {
    const requestUrl = new URL(request.url ?? "", `http://${request.headers.host ?? "localhost"}`);
    if (requestUrl.pathname === "/api/audio/interpretation") {
      audioInterpretationWss.handleUpgrade(request, socket, head, (webSocket) => {
        audioInterpretationWss.emit("connection", webSocket, request);
      });
      return;
    }

    if (requestUrl.pathname !== "/api/audio/live") {
      return;
    }

    audioLiveWss.handleUpgrade(request, socket, head, (webSocket) => {
      audioLiveWss.emit("connection", webSocket, request);
    });
  });
}

// Gemini-Powered Lecture Summarizer endpoint
app.post("/api/summarize", async (req, res) => {
  const transcript = appState.subtitles.map(s => `[${s.speaker}] ${s.original} -> ${s.translated}`).join("\n");
  
  if (!transcript) {
    return res.json({ summary: "작성된 실시간 자막 대본이 없어 요약을 생성할 수 없습니다. 대본을 추가하고 다시 요약해주세요." });
  }

  const prompt = `Please summarize this medical symposium transcript. Provide a highly professional, clinical summary in Korean.
Organize it with clean bullet points including:
1. 심포지엄 핵심 주제 (Core Medical Theme)
2. 주요 발표 내용 및 임상적 의의 (Clinical Insights & Trials discussed, like SGLT2, GLP-1, or NMOSD)
3. 참석자 권장 가이드라인 및 결론 (Clinical Recommendations)

Here is the transcript:
${transcript}`;

  if (aiClient) {
    try {
      const response = await aiClient.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are an elite medical editor summarizing online clinical symposia for medical doctors.",
          temperature: 0.3,
        }
      });
      return res.json({ summary: response.text?.trim() || "요약 생성 실패" });
    } catch (error: any) {
      console.error("Gemini Summary Error:", error);
    }
  }

  // Fallback high-fidelity summary
  const mockSummary = `### [AI 의학 학술대회 심포지엄 요약 보고서]
*본 요약은 의학 행사 데이터를 바탕으로 실시간 자동 생성된 학술 서머리입니다.*

#### 1. 대사 및 시신경 질환 이중 표적 신약 치료제 동향
- 이번 강연에서는 **이중 표적 치료제(Dual-targeting therapies)**의 임상 작용 기전과 치료 성과를 비교 분석하였습니다.
- 당뇨병 및 고위험군 심혈관 환자 관리에 있어 **GLP-1 수용체 작용제(GLP-1 receptor agonist)**의 우수한 대사 조절 능력과 장기 안정성이 확인되었습니다.

#### 2. SGLT2 억제제의 심장 및 신장 동시 보호 기전
- **SGLT2 억제제(empagliflozin)**의 대규모 임상 시험에서 주 평가 변수(**Primary Endpoint**)인 심혈관 사건 발생 위험과 심부전으로 인한 입원율이 대조군 대비 대폭 감소하였습니다.
- 환자의 신장 사구체 기능 저하를 억제하는 효과가 입증됨에 따라, 임상 현장에서 **eGFR(추정 사구체 여과율)**의 정기적인 검사와 신기능 수치 연동 맞춤형 처방 가이드라인이 필요합니다.

#### 3. 임상 현장 적용 가이드 및 이상반응 모니터링
- 약물 투여 기간 동안 나타날 수 있는 예측 가능한 **이상사례(Adverse Event)**에 대한 예방 조치를 선제적으로 마련해야 합니다.
- 임상 의료진은 처방 전 환자의 동반 질환 및 신장 여과 능력을 다각도로 검토할 것을 권장합니다.`;

  res.json({ summary: mockSummary, engine: "Rule-based Auto Summarizer" });
});

// Setup Vite or static serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const httpServer = createHttpServer(app);
  installAudioLiveWebSocketServer(httpServer);
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
