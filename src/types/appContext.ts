import { AppState, DictionaryItem } from "../types";

export interface AppDataContext {
  appState: AppState;
  dictionary: DictionaryItem[];
  playbackSpeed: number;
  setPlaybackSpeed: (speed: number) => void;
  updateServerState: (updates: Partial<AppState>) => Promise<void>;
  fetchState: () => Promise<void>;
  fetchDictionary: () => Promise<void>;
  handleAddQA: (text: string, user: string) => Promise<void>;
  handleAnswerQA: (id: string, answer: string) => Promise<void>;
  handleAddBookmark: (title: string) => Promise<void>;
  handleDeleteBookmark: (id: string) => Promise<void>;
  handleAddNote: (text: string) => Promise<void>;
  handleDeleteNote: (id: string) => Promise<void>;
}
