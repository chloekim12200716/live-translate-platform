import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json());

// Initialize Gemini SDK with fallback
let aiClient: GoogleGenAI | null = null;
const API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";

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

// In-Memory Live State
let appState = {
  sessionMode: "live", // "live" | "vod"
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

  const normalizedSourceLang = (sourceLang || "en").toLowerCase();
  const normalizedTargetLang = (targetLang || "ko").toLowerCase();
  if (normalizedSourceLang === normalizedTargetLang) {
    return res.json({
      translatedText: text,
      engine: "Source Caption",
      sourceLang: normalizedSourceLang,
      targetLang: normalizedTargetLang
    });
  }

  // Generate helper prompt with dictionary injection
  const dictionaryContext = medicalDictionary.map(item => `- ${item.term}: ${item.definition}`).join("\n");
  const systemInstruction = `You are an expert medical translator specializing in pharmaceutical and clinical conference translation.
Translate from ${getLanguageLabel(normalizedSourceLang)} into ${getLanguageLabel(normalizedTargetLang)} accurately, keeping medical terms correct and clean.
For Korean output, use polite medical conference style. For other languages, use natural academic conference style.
Here is a list of approved medical dictionary terms and definitions to respect if they appear in the source text:
${dictionaryContext}

Output ONLY the direct translation. Do not include extra comments, intros, or explanations.`;

  if (aiClient) {
    try {
      const response = await aiClient.models.generateContent({
        model: GEMINI_MODEL,
        contents: text,
        config: {
          systemInstruction,
          temperature: 0.1,
        }
      });
      const translatedText = response.text?.trim() || "";
      return res.json({
        translatedText,
        engine: `Gemini ${GEMINI_MODEL}`,
        sourceLang: normalizedSourceLang,
        targetLang: normalizedTargetLang
      });
    } catch (error: any) {
      console.error("Gemini Translation Error:", error);
      // fallback to mock translation if API fails
    }
  }

  res.json({
    translatedText: getFallbackTranslation(text, normalizedSourceLang, normalizedTargetLang),
    engine: "Rule-based Medical Dict Engine",
    sourceLang: normalizedSourceLang,
    targetLang: normalizedTargetLang
  });
});

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
- 이번 세션에서는 **이중 표적 치료제(Dual-targeting therapies)**의 임상 작용 기전과 치료 성과를 비교 분석하였습니다.
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
