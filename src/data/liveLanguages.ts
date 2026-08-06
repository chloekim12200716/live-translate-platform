export interface LiveLanguageOption {
  code: string;
  label: string;
  nativeLabel: string;
  geminiTargetCode: string;
  speechCode: string;
  enabledByDefault?: boolean;
}

export const liveLanguageOptions: LiveLanguageOption[] = [
  { code: "ar", label: "Arabic", nativeLabel: "العربية", geminiTargetCode: "ar", speechCode: "ar", enabledByDefault: true },
  { code: "zh", label: "Chinese", nativeLabel: "中文", geminiTargetCode: "zh-CN", speechCode: "zh-CN", enabledByDefault: true },
  { code: "en", label: "English", nativeLabel: "English", geminiTargetCode: "en", speechCode: "en-US", enabledByDefault: true },
  { code: "fr", label: "French", nativeLabel: "Français", geminiTargetCode: "fr", speechCode: "fr-FR", enabledByDefault: true },
  { code: "ko", label: "Korean", nativeLabel: "한국어", geminiTargetCode: "ko", speechCode: "ko-KR", enabledByDefault: true },
  { code: "ru", label: "Russian", nativeLabel: "Русский", geminiTargetCode: "ru", speechCode: "ru-RU", enabledByDefault: true },
  { code: "es", label: "Spanish", nativeLabel: "Español", geminiTargetCode: "es", speechCode: "es-ES", enabledByDefault: true },
  { code: "lo", label: "Lao", nativeLabel: "ລາວ", geminiTargetCode: "lo", speechCode: "lo-LA" },
  { code: "ja", label: "Japanese", nativeLabel: "日本語", geminiTargetCode: "ja", speechCode: "ja-JP" },
  { code: "vi", label: "Vietnamese", nativeLabel: "Tiếng Việt", geminiTargetCode: "vi", speechCode: "vi-VN" },
  { code: "th", label: "Thai", nativeLabel: "ไทย", geminiTargetCode: "th", speechCode: "th-TH" },
  { code: "km", label: "Khmer", nativeLabel: "ភាសាខ្មែរ", geminiTargetCode: "km", speechCode: "km-KH" },
  { code: "id", label: "Indonesian", nativeLabel: "Bahasa Indonesia", geminiTargetCode: "id", speechCode: "id-ID" },
  { code: "mn", label: "Mongolian", nativeLabel: "Монгол", geminiTargetCode: "mn", speechCode: "mn-MN" },
  { code: "ne", label: "Nepali", nativeLabel: "नेपाली", geminiTargetCode: "ne", speechCode: "ne-NP" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी", geminiTargetCode: "hi", speechCode: "hi-IN" },
  { code: "ur", label: "Urdu", nativeLabel: "اردو", geminiTargetCode: "ur", speechCode: "ur-PK" },
  { code: "de", label: "German", nativeLabel: "Deutsch", geminiTargetCode: "de", speechCode: "de-DE" },
  { code: "it", label: "Italian", nativeLabel: "Italiano", geminiTargetCode: "it", speechCode: "it-IT" },
  { code: "pt", label: "Portuguese", nativeLabel: "Português", geminiTargetCode: "pt", speechCode: "pt-BR" },
  { code: "tr", label: "Turkish", nativeLabel: "Türkçe", geminiTargetCode: "tr", speechCode: "tr-TR" },
  { code: "fa", label: "Persian", nativeLabel: "فارسی", geminiTargetCode: "fa", speechCode: "fa-IR" }
];

export const supportedLiveLanguageCodes = liveLanguageOptions.map((language) => language.code);
export const defaultLiveLanguageCodes = liveLanguageOptions
  .filter((language) => language.enabledByDefault)
  .map((language) => language.code);

export function getLiveLanguageOption(languageCode: string | undefined) {
  const normalizedLanguageCode = languageCode?.toLowerCase() ?? "";
  return liveLanguageOptions.find((language) => language.code === normalizedLanguageCode);
}

export function getLiveLanguageLabel(languageCode: string | undefined) {
  const language = getLiveLanguageOption(languageCode);
  return language?.label ?? languageCode ?? "the requested language";
}

export function getLiveLanguageNativeLabel(languageCode: string | undefined) {
  const language = getLiveLanguageOption(languageCode);
  return language?.nativeLabel ?? languageCode ?? "";
}

export function getLiveTranslateLanguageCode(languageCode: string) {
  return getLiveLanguageOption(languageCode)?.geminiTargetCode ?? languageCode.toLowerCase();
}

export function getLiveSpeechLanguageCode(languageCode: string) {
  return getLiveLanguageOption(languageCode)?.speechCode ?? languageCode.toLowerCase();
}

export function normalizeLiveLanguageList(languageCodes: Array<string | undefined>, fallbackLanguageCodes = defaultLiveLanguageCodes) {
  const supportedLanguageCodeSet = new Set(supportedLiveLanguageCodes);
  const normalizedLanguageCodes = languageCodes
    .map((languageCode) => languageCode?.trim().toLowerCase() ?? "")
    .filter((languageCode) => supportedLanguageCodeSet.has(languageCode));
  const uniqueLanguageCodes = Array.from(new Set(normalizedLanguageCodes));

  return uniqueLanguageCodes.length > 0 ? uniqueLanguageCodes : fallbackLanguageCodes;
}
