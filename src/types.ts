export interface Subtitle {
  id: string;
  timestamp: number; // in seconds
  speaker: string;
  original: string;
  translated: string;
  isFinal: boolean;
  isEdited?: boolean;
}

export interface DictionaryItem {
  term: string;
  definition: string;
  category: string;
}

export interface QAItem {
  id: string;
  user: string;
  text: string;
  timestamp: string;
  isAnswered: boolean;
  answer?: string;
}

export interface Bookmark {
  id: string;
  timestamp: number;
  title: string;
}

export interface Note {
  id: string;
  timestamp: number;
  text: string;
}

export interface AppState {
  sessionMode: string; // "live" | "vod"
  speakerLang: string; // "en" | "ko"
  outputLang: string;  // "ko" | "en" | "both"
  isCapturing: boolean;
  layout: string;      // "split" | "speaker" | "slide"
  currentVideoTime: number;
  subtitles: Subtitle[];
  qaList: QAItem[];
  bookmarks: Bookmark[];
  notes: Note[];
}
