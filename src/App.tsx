import React, { useEffect, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes
} from "react-router-dom";
import AppShell from "./components/layout/AppShell";
import AdminPage from "./pages/admin/AdminPage";
import AdminChannelsPage from "./pages/admin/AdminChannelsPage";
import ChannelLayoutEditorPage from "./pages/admin/ChannelLayoutEditorPage";
import DemoPage from "./pages/demo/DemoPage";
import LiveChannelPage from "./pages/live/LiveChannelPage";
import { AppDataContext } from "./types/appContext";
import { AppState, DictionaryItem } from "./types";

function RoutedApp(appData: AppDataContext) {
  return (
    <Routes>
      <Route path="/live/:channelSlug/:languageCode" element={<LiveChannelPage />} />
      <Route
        path="/*"
        element={
          <AppShell>
            <Routes>
              <Route path="/" element={<DemoPage {...appData} />} />
              <Route path="/demo" element={<DemoPage {...appData} />} />
              <Route path="/admin" element={<AdminPage {...appData} />} />
              <Route path="/admin/channels" element={<AdminChannelsPage />} />
              <Route path="/admin/channels/:channelId/layout" element={<ChannelLayoutEditorPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AppShell>
        }
      />
    </Routes>
  );
}

export default function App() {
  const [appState, setAppState] = useState<AppState>({
    broadcastMode: "live",
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

  useEffect(() => {
    fetchState();
    fetchDictionary();

    const stateInterval = setInterval(() => {
      fetchState();
    }, 1500);

    return () => clearInterval(stateInterval);
  }, []);

  const updateServerState = async (updates: Partial<AppState>) => {
    try {
      setAppState((prev) => ({ ...prev, ...updates } as AppState));

      await fetch("/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
    } catch (error) {
      console.error("Error updating server state:", error);
    }
  };

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
    <BrowserRouter>
      <RoutedApp
        appState={appState}
        dictionary={dictionary}
        playbackSpeed={playbackSpeed}
        setPlaybackSpeed={setPlaybackSpeed}
        updateServerState={updateServerState}
        fetchState={fetchState}
        fetchDictionary={fetchDictionary}
        handleAddQA={handleAddQA}
        handleAnswerQA={handleAnswerQA}
        handleAddBookmark={handleAddBookmark}
        handleDeleteBookmark={handleDeleteBookmark}
        handleAddNote={handleAddNote}
        handleDeleteNote={handleDeleteNote}
      />
    </BrowserRouter>
  );
}
