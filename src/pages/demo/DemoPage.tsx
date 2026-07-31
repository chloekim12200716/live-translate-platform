import React from "react";
import { Link } from "react-router-dom";
import { Layers } from "lucide-react";
import AdminCMS from "../../components/AdminCMS";
import QAPanel from "../../components/QAPanel";
import TranscriptSidebar from "../../components/TranscriptSidebar";
import VideoPlayer from "../../components/VideoPlayer";
import { mockPlatformChannel } from "../../data/mockPlatformData";
import { AppDataContext } from "../../types/appContext";

export default function DemoPage({
  appState,
  dictionary,
  playbackSpeed,
  setPlaybackSpeed,
  updateServerState,
  handleAddQA,
  handleAnswerQA,
  handleAddBookmark,
  handleDeleteBookmark,
  handleAddNote,
  handleDeleteNote,
  fetchDictionary
}: AppDataContext) {
  return (
    <div className="space-y-6">
      <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex items-start gap-3.5 text-left text-xs text-indigo-950 shadow-sm">
        <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600 flex-shrink-0">
          <Layers className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h3 className="font-bold">심포지엄 통합 듀얼 데모 안내</h3>
          <p className="text-indigo-900/90 leading-relaxed">
            기존 AI Studio 데모를 유지한 화면입니다. 운영 플랫폼용 공개 시청자 화면은 <Link className="font-bold text-indigo-700 underline" to={`/live/${mockPlatformChannel.slug}/en`}>/live/{mockPlatformChannel.slug}/en</Link> 경로에서 확인할 수 있습니다.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-6">
          <VideoPlayer
            currentVideoTime={appState.currentVideoTime}
            setCurrentVideoTime={(time) => updateServerState({ currentVideoTime: time })}
            playbackSpeed={playbackSpeed}
            setPlaybackSpeed={setPlaybackSpeed}
            subtitles={appState.subtitles}
            dictionary={dictionary}
            layout={appState.layout}
            setLayout={(layout) => updateServerState({ layout })}
            broadcastMode={appState.broadcastMode}
          />

          <QAPanel
            qaList={appState.qaList}
            onAddQA={handleAddQA}
            onAnswerQA={handleAnswerQA}
            isAdmin={true}
          />
        </div>

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
  );
}
