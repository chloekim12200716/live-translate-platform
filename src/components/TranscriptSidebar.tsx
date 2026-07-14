import React, { useState } from "react";
import { Search, Clock, Bookmark, BookOpen, FileText, Sparkles, Plus, Trash2, Edit3, CheckCircle2 } from "lucide-react";
import { Subtitle, Bookmark as BookmarkType, Note as NoteType } from "../types";

interface TranscriptSidebarProps {
  subtitles: Subtitle[];
  bookmarks: BookmarkType[];
  notes: NoteType[];
  currentVideoTime: number;
  setCurrentVideoTime: (time: number) => void;
  onAddBookmark: (title: string) => void;
  onDeleteBookmark: (id: string) => void;
  onAddNote: (text: string) => void;
  onDeleteNote: (id: string) => void;
}

export default function TranscriptSidebar({
  subtitles,
  bookmarks,
  notes,
  currentVideoTime,
  setCurrentVideoTime,
  onAddBookmark,
  onDeleteBookmark,
  onAddNote,
  onDeleteNote
}: TranscriptSidebarProps) {
  const [activeTab, setActiveTab] = useState<"transcript" | "study" | "ai">("transcript");
  const [searchQuery, setSearchQuery] = useState("");
  const [newNoteText, setNewNoteText] = useState("");
  const [newBookmarkTitle, setNewBookmarkTitle] = useState("");
  const [aiSummary, setAiSummary] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Filter transcript based on query
  const filteredSubtitles = subtitles.filter(
    (sub) =>
      sub.original.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.translated.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const handleFetchAiSummary = async () => {
    setIsAiLoading(true);
    try {
      const response = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const data = await response.json();
      setAiSummary(data.summary || "요약 내용을 받지 못했습니다.");
    } catch (error) {
      console.error(error);
      setAiSummary("AI 요약을 생성하는 중에 오류가 발생했습니다. 서버 상태를 확인해주세요.");
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-[650px] overflow-hidden">
      {/* Sidebar Header Tabs */}
      <div className="bg-slate-50 border-b border-slate-200 p-2 flex gap-1">
        <button
          onClick={() => setActiveTab("transcript")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition ${activeTab === "transcript" ? "bg-white text-indigo-600 shadow-sm border border-slate-200" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"}`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          실시간 대본 검색
        </button>
        <button
          onClick={() => setActiveTab("study")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition ${activeTab === "study" ? "bg-white text-indigo-600 shadow-sm border border-slate-200" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"}`}
        >
          <Clock className="w-3.5 h-3.5" />
          학습 메모·북마크
        </button>
        <button
          onClick={() => setActiveTab("ai")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition ${activeTab === "ai" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"}`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          AI 강연 요약
        </button>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        
        {/* TAB 1: INTERACTIVE SEARCHABLE TRANSCRIPT */}
        {activeTab === "transcript" && (
          <div className="p-4 flex flex-col h-full overflow-hidden">
            {/* Search Input */}
            <div className="relative mb-3 flex-shrink-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="의학 용어 또는 발표 원문 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
              />
            </div>

            {/* Script List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {filteredSubtitles.length > 0 ? (
                filteredSubtitles.map((sub) => (
                  <div
                    key={sub.id}
                    onClick={() => setCurrentVideoTime(sub.timestamp)}
                    className="p-3 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 cursor-pointer transition text-left group"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        {sub.speaker}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] font-mono text-indigo-500 group-hover:underline">
                        <Clock className="w-3 h-3" />
                        {formatTime(sub.timestamp)}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-800 mb-1 leading-relaxed">
                      {sub.original}
                    </p>
                    <p className="text-xs text-indigo-600 font-medium leading-relaxed">
                      {sub.translated}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-slate-400 text-xs">
                  검색어와 매칭되는 자막이 없습니다.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: PERSONAL STUDY ROOM (MEMO & BOOKMARKS) */}
        {activeTab === "study" && (
          <div className="p-4 space-y-5">
            {/* 1. Sync Bookmarking Tool */}
            <div className="space-y-2 bg-slate-50 border border-slate-100 rounded-xl p-3">
              <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Bookmark className="w-3.5 h-3.5 text-indigo-600" />
                현재 영상 재생 지점 북마크
              </h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={`예: 신장 보호 임상 설명 구간 (${formatTime(currentVideoTime)})`}
                  value={newBookmarkTitle}
                  onChange={(e) => setNewBookmarkTitle(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
                />
                <button
                  onClick={() => {
                    onAddBookmark(newBookmarkTitle);
                    setNewBookmarkTitle("");
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1 transition"
                >
                  <Plus className="w-3 h-3" />
                  북마크
                </button>
              </div>

              {/* Bookmark List */}
              <div className="space-y-1.5 mt-3 pt-2 border-t border-slate-200 max-h-40 overflow-y-auto">
                {bookmarks.length > 0 ? (
                  bookmarks.map((bm) => (
                    <div key={bm.id} className="flex justify-between items-center p-2 bg-white rounded border border-slate-100">
                      <button
                        onClick={() => setCurrentVideoTime(bm.timestamp)}
                        className="text-[11px] text-slate-700 font-semibold hover:text-indigo-600 hover:underline text-left flex items-center gap-1.5"
                      >
                        <Clock className="w-3 h-3 text-indigo-500 flex-shrink-0" />
                        <span className="font-mono font-medium text-slate-400">[{formatTime(bm.timestamp)}]</span>
                        <span className="truncate max-w-[180px]">{bm.title}</span>
                      </button>
                      <button
                        onClick={() => onDeleteBookmark(bm.id)}
                        className="text-slate-400 hover:text-rose-500 p-1"
                        title="삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] text-slate-400 text-center py-2">등록된 북마크가 없습니다.</p>
                )}
              </div>
            </div>

            {/* 2. Personal Memo taking synced with playback point */}
            <div className="space-y-2 bg-slate-50 border border-slate-100 rounded-xl p-3">
              <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                시점 연동 개인 학습 메모
              </h3>
              <div className="flex flex-col gap-2">
                <textarea
                  placeholder={`현재 ${formatTime(currentVideoTime)} 지점에 기록할 임상 메모 사항을 입력하세요...`}
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
                />
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-500 font-mono">
                    타임스탬프: {formatTime(currentVideoTime)}
                  </span>
                  <button
                    onClick={() => {
                      if (!newNoteText.trim()) return;
                      onAddNote(newNoteText);
                      setNewNoteText("");
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1 transition self-end"
                  >
                    <Plus className="w-3 h-3" />
                    메모 추가
                  </button>
                </div>
              </div>

              {/* Memo List */}
              <div className="space-y-1.5 mt-3 pt-2 border-t border-slate-200 max-h-48 overflow-y-auto">
                {notes.length > 0 ? (
                  notes.map((note) => (
                    <div key={note.id} className="p-2.5 bg-white rounded border border-slate-100 space-y-1">
                      <div className="flex justify-between items-center">
                        <button
                          onClick={() => setCurrentVideoTime(note.timestamp)}
                          className="text-[10px] text-indigo-600 font-mono font-bold hover:underline flex items-center gap-1"
                        >
                          <Clock className="w-3 h-3" />
                          {formatTime(note.timestamp)} 이동
                        </button>
                        <button
                          onClick={() => onDeleteNote(note.id)}
                          className="text-slate-400 hover:text-rose-500 p-1"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed font-sans text-left">
                        {note.text}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] text-slate-400 text-center py-2">등록된 학습 메모가 없습니다.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: AI SYMPOSIUM AUTO SUMMARY */}
        {activeTab === "ai" && (
          <div className="p-5 flex flex-col h-full space-y-4">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center mx-auto text-indigo-600">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-slate-800">
                  실시간 대본 기반 AI 임상 요약
                </h3>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  현재까지 생성된 세션 대본을 바탕으로 신약 기전, 1차 평가변수(Primary Endpoint) 및 학술 요약 보고서를 Gemini 3.5가 실시간 요약합니다.
                </p>
              </div>
              <button
                onClick={handleFetchAiSummary}
                disabled={isAiLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow"
              >
                {isAiLoading ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    의학 전문지식 분석 중...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    학술 세션 요약문 생성
                  </>
                )}
              </button>
            </div>

            {/* Output Display area */}
            <div className="flex-1 bg-slate-50 border border-slate-100 rounded-xl p-4 overflow-y-auto text-left min-h-64">
              {aiSummary ? (
                <div className="prose prose-sm text-xs text-slate-700 leading-relaxed font-sans space-y-3">
                  <div className="flex items-center gap-1 text-emerald-600 font-semibold mb-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Gemini 3.5 학술 검수 보고서</span>
                  </div>
                  <div className="whitespace-pre-wrap font-sans text-slate-800">
                    {aiSummary}
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs text-center">
                  대본 요약 버튼을 누르면 AI 보고서가 여기에 렌더링됩니다.
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
