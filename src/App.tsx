import React, { useState, useEffect } from "react";
import { Tv, Settings, Activity, Sparkles, BookOpen, Layers, HelpCircle, User, BrainCircuit } from "lucide-react";
import VideoPlayer from "./components/VideoPlayer";
import TranscriptSidebar from "./components/TranscriptSidebar";
import AdminCMS from "./components/AdminCMS";
import QAPanel from "./components/QAPanel";
import { AppState, DictionaryItem } from "./types";

export default function App() {
  const [activeWorkspace, setActiveWorkspace] = useState<"dual" | "viewer" | "admin">("dual");
  
  // High-level React State synchronized with Express backend
  const [appState, setAppState] = useState<AppState>({
    sessionMode: "live",
    speakerLang: "en",
    outputLang: "ko",
    isCapturing: false,
    layout: "split",
    currentVideoTime: 0,
    subtitles: [],
    qaList: [],
    bookmarks: [],
    notes: []
  });

  const [dictionary, setDictionary] = useState<DictionaryItem[]>([]);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);

  // Fetch complete state from Express server
  const fetchState = async () => {
    try {
      const res = await fetch("/api/state");
      if (res.ok) {
        const data = await res.json();
        setAppState(data);
      }
    } catch (error) {
      console.error("Error polling server state:", error);
    }
  };

  // Fetch dictionary
  const fetchDictionary = async () => {
    try {
      const res = await fetch("/api/dictionary");
      if (res.ok) {
        const data = await res.json();
        setDictionary(data);
      }
    } catch (error) {
      console.error("Error fetching medical dictionary:", error);
    }
  };

  // Initial load + Real-time Sync Polling
  useEffect(() => {
    fetchState();
    fetchDictionary();

    // Poll state every 1.5s to ensure separate browser tabs or components stay in perfect sync!
    const stateInterval = setInterval(() => {
      fetchState();
    }, 1500);

    return () => clearInterval(stateInterval);
  }, []);

  // Post State updates to server
  const updateServerState = async (updates: Partial<AppState>) => {
    try {
      // Optimistic client-side state merge
      setAppState(prev => ({ ...prev, ...updates } as AppState));

      await fetch("/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
    } catch (error) {
      console.error("Error updating server state:", error);
    }
  };

  // State handlers to send to components
  const handleAddQA = async (text: string, user: string) => {
    try {
      const res = await fetch("/api/qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, user })
      });
      if (res.ok) fetchState();
    } catch (error) {
      console.error(error);
    }
  };

  const handleAnswerQA = async (id: string, answer: string) => {
    try {
      const res = await fetch("/api/qa/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, answer })
      });
      if (res.ok) fetchState();
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddBookmark = async (title: string) => {
    try {
      const res = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timestamp: appState.currentVideoTime, title })
      });
      if (res.ok) fetchState();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteBookmark = async (id: string) => {
    try {
      const res = await fetch("/api/bookmarks/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      if (res.ok) fetchState();
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddNote = async (text: string) => {
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timestamp: appState.currentVideoTime, text })
      });
      if (res.ok) fetchState();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      const res = await fetch("/api/notes/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      if (res.ok) fetchState();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col antialiased">
      
      {/* GLOBAL HEADER BAR */}
      <header className="bg-slate-900 text-white shadow-md border-b border-slate-800 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 flex-shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-600/30">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <div className="text-left">
            <h1 className="text-md font-extrabold tracking-tight flex items-center gap-2">
              MediCast CC <span className="text-[10px] bg-indigo-500/30 text-indigo-300 font-semibold px-2 py-0.5 rounded-full uppercase">AI-Powered</span>
            </h1>
            <p className="text-xs text-slate-400">의학행사 실시간 자막·통역 하이브리드 미디어 플랫폼</p>
          </div>
        </div>

        {/* WORKSPACE SWITCHER */}
        <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700/50">
          <button
            onClick={() => setActiveWorkspace("dual")}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${activeWorkspace === "dual" ? "bg-indigo-600 text-white shadow-md" : "text-slate-300 hover:text-white"}`}
          >
            <Layers className="w-3.5 h-3.5" />
            통합 데모 모드 (Dual)
          </button>
          <button
            onClick={() => setActiveWorkspace("viewer")}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${activeWorkspace === "viewer" ? "bg-indigo-600 text-white shadow-md" : "text-slate-300 hover:text-white"}`}
          >
            <Tv className="w-3.5 h-3.5" />
            시청자 화면 (Viewer)
          </button>
          <button
            onClick={() => setActiveWorkspace("admin")}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${activeWorkspace === "admin" ? "bg-indigo-600 text-white shadow-md" : "text-slate-300 hover:text-white"}`}
          >
            <Settings className="w-3.5 h-3.5" />
            관리자 콘솔 (Admin CMS)
          </button>
        </div>
      </header>

      {/* CORE WORKSPACE PANEL */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        
        {/* VIEW 1: DUAL LIVE DASHBOARD */}
        {activeWorkspace === "dual" && (
          <div className="space-y-6">
            {/* Top Info Banner explaining the Dual Mode */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex items-start gap-3.5 text-left text-xs text-indigo-950 shadow-sm">
              <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600 flex-shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold">심포지엄 통합 듀얼 데모 안내</h3>
                <p className="text-indigo-900/90 leading-relaxed">
                  본 모드는 <strong>운영자용 자막 제어국(CMS)</strong>과 <strong>시청자용 비디오 라이브 채널</strong>을 한 페이지에 배치하여 양방향 연동을 한눈에 테스트할 수 있도록 디자인되었습니다.
                  오른쪽 CMS에서 <strong className="text-indigo-600">"임상 연설 시뮬레이션 시작"</strong>을 누르면 연자의 실시간 말소리가 감지되어 왼쪽 비디오 자막으로 번역 및 송출됩니다. 실시간 수정 버튼으로 수정도 가능합니다!
                </p>
              </div>
            </div>

            {/* Grid Layout containing Video + Sidebar on left, CMS on right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column (Viewer side - 7/12) */}
              <div className="lg:col-span-7 space-y-6">
                <VideoPlayer
                  currentVideoTime={appState.currentVideoTime}
                  setCurrentVideoTime={(time) => updateServerState({ currentVideoTime: time })}
                  playbackSpeed={playbackSpeed}
                  setPlaybackSpeed={setPlaybackSpeed}
                  subtitles={appState.subtitles}
                  dictionary={dictionary}
                  layout={appState.layout}
                  setLayout={(lay) => updateServerState({ layout: lay })}
                  sessionMode={appState.sessionMode}
                />
                
                <QAPanel
                  qaList={appState.qaList}
                  onAddQA={handleAddQA}
                  onAnswerQA={handleAnswerQA}
                  isAdmin={true} // In dual mode we act as admin + viewer to allow easy testing!
                />
              </div>

              {/* Right Column (Admin Operations & Sidebar - 5/12) */}
              <div className="lg:col-span-5 space-y-6">
                <TranscriptSidebar
                  subtitles={appState.subtitles}
                  bookmarks={appState.bookmarks}
                  notes={appState.notes}
                  currentVideoTime={appState.currentVideoTime}
                  setCurrentVideoTime={(time) => updateServerState({ currentVideoTime: time })}
                  onAddBookmark={handleAddBookmark}
                  onDeleteBookmark={handleDeleteBookmark}
                  onAddNote={handleAddNote}
                  onDeleteNote={handleDeleteNote}
                />

                <AdminCMS
                  appState={appState}
                  dictionary={dictionary}
                  onUpdateState={updateServerState}
                  onRefreshDictionary={fetchDictionary}
                  currentVideoTime={appState.currentVideoTime}
                />
              </div>

            </div>
          </div>
        )}

        {/* VIEW 2: VIEWER-ONLY MODE */}
        {activeWorkspace === "viewer" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Main Video Stream Player */}
            <div className="lg:col-span-8 space-y-6">
              <VideoPlayer
                currentVideoTime={appState.currentVideoTime}
                setCurrentVideoTime={(time) => updateServerState({ currentVideoTime: time })}
                playbackSpeed={playbackSpeed}
                setPlaybackSpeed={setPlaybackSpeed}
                subtitles={appState.subtitles}
                dictionary={dictionary}
                layout={appState.layout}
                setLayout={(lay) => updateServerState({ layout: lay })}
                sessionMode={appState.sessionMode}
              />

              <QAPanel
                qaList={appState.qaList}
                onAddQA={handleAddQA}
                onAnswerQA={handleAnswerQA}
                isAdmin={false} // True user context
              />
            </div>

            {/* Sidebar with interactive tools */}
            <div className="lg:col-span-4">
              <TranscriptSidebar
                subtitles={appState.subtitles}
                bookmarks={appState.bookmarks}
                notes={appState.notes}
                currentVideoTime={appState.currentVideoTime}
                setCurrentVideoTime={(time) => updateServerState({ currentVideoTime: time })}
                onAddBookmark={handleAddBookmark}
                onDeleteBookmark={handleDeleteBookmark}
                onAddNote={handleAddNote}
                onDeleteNote={handleDeleteNote}
              />
            </div>

          </div>
        )}

        {/* VIEW 3: ADMIN CMS ONLY */}
        {activeWorkspace === "admin" && (
          <div className="space-y-6">
            <AdminCMS
              appState={appState}
              dictionary={dictionary}
              onUpdateState={updateServerState}
              onRefreshDictionary={fetchDictionary}
              currentVideoTime={appState.currentVideoTime}
            />

            <QAPanel
              qaList={appState.qaList}
              onAddQA={handleAddQA}
              onAnswerQA={handleAnswerQA}
              isAdmin={true}
            />
          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 py-6 text-center text-xs mt-auto flex-shrink-0">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>MediCast Core System - AI 실시간 의학행사 자막·통역 플랫폼 v2.4</span>
          </div>
          <div className="flex gap-4">
            <a href="#" className="hover:text-slate-200 transition">서비스 이용 약관</a>
            <span className="text-slate-700">|</span>
            <a href="#" className="hover:text-slate-200 transition">개인정보 처리방침</a>
            <span className="text-slate-700">|</span>
            <span className="font-mono text-slate-500">Powered by Gemini 3.5 Flash & Antigravity</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
