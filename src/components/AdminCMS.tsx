import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Settings, Languages, Plus, Trash2, Edit2, Play, Pause, Save, Check, RotateCcw, HelpCircle, BookOpen } from "lucide-react";
import { Subtitle, DictionaryItem, AppState } from "../types";

interface AdminCMSProps {
  appState: AppState;
  dictionary: DictionaryItem[];
  onUpdateState: (newState: Partial<AppState>) => void;
  onRefreshDictionary: () => void;
  currentVideoTime: number;
}

export default function AdminCMS({
  appState,
  dictionary,
  onUpdateState,
  onRefreshDictionary,
  currentVideoTime
}: AdminCMSProps) {
  // Local state for editing fields
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [editOrigText, setEditOrigText] = useState("");
  const [editTransText, setEditTransText] = useState("");

  // New Subtitle builder
  const [newOrigText, setNewOrigText] = useState("");
  const [newTransText, setNewTransText] = useState("");

  // New Dictionary Item form
  const [dictTerm, setDictTerm] = useState("");
  const [dictDef, setDictDef] = useState("");
  const [dictCat, setDictCat] = useState("질환명");

  // Simulation controls
  const [isSimulating, setIsSimulating] = useState(false);
  const [simIndex, setSimIndex] = useState(0);
  const simTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Web Speech API
  const [micActive, setMicActive] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Standard pre-defined clinical mock channel script
  const mockEnChannelScript = [
    {
      text: "In today's clinical update, we will discuss the dual-targeting mechanism of GLP-1 receptor agonist and GIP receptor co-agonists.",
      translated: "오늘 임상 업데이트에서는 GLP-1 수용체 작용제와 GIP 수용체 공동 작용제의 이중 표적 기전에 대해 논의하겠습니다.",
      time: 10
    },
    {
      text: "Recent randomized clinical trials showed significant cardiovascular benefits, especially for patients with high cardiovascular risk.",
      translated: "최근 무작위 임상시험에서는 특히 심혈관 위험이 높은 환자에게 유의미한 심혈관 이점이 확인되었습니다.",
      time: 25
    },
    {
      text: "Moreover, SGLT2 inhibitors like empagliflozin have demonstrated a reduction in the primary endpoint of cardiovascular death or hospitalization for heart failure.",
      translated: "또한 엠파글리플로진 같은 SGLT2 억제제는 심혈관 사망 또는 심부전 입원이라는 1차 평가변수를 감소시키는 결과를 보였습니다.",
      time: 45
    },
    {
      text: "We should also monitor renal functions, including eGFR, to assess any progression of chronic kidney disease.",
      translated: "만성 신장질환의 진행 여부를 평가하기 위해 eGFR을 포함한 신장 기능도 함께 모니터링해야 합니다.",
      time: 65
    }
  ];

  const mockKoChannelScript = [
    {
      text: "오늘 강연에서는 시신경척수염 범주질환, 즉 NMOSD 환자의 최신 치료 전략에 대해 설명해 드리겠습니다.",
      translated: "In today's lecture, we will review the latest treatment strategies for patients with neuromyelitis optica spectrum disorder, or NMOSD.",
      time: 10
    },
    {
      text: "AQP4-IgG 양성 환자들의 장기 재발을 효과적으로 방지하기 위해 이중 표적 항체 치료가 선구적인 역할을 하고 있습니다.",
      translated: "Dual-target antibody therapy is playing a leading role in preventing long-term relapse in AQP4-IgG positive patients.",
      time: 25
    },
    {
      text: "실제 임상 데이터상 약물 투여군은 primary endpoint인 재발 위험을 대조군 대비 무려 70% 이상 유의하게 낮추었습니다.",
      translated: "In real-world clinical data, the treatment group reduced the primary endpoint, relapse risk, by more than 70% compared with the control group.",
      time: 45
    },
    {
      text: "모니터링 과정에서 백혈구 감소증이나 주사 부위 감염 같은 예측 가능한 adverse event 유무를 항시 체크해야 합니다.",
      translated: "During monitoring, predictable adverse events such as leukopenia or injection-site infection should be checked continuously.",
      time: 65
    }
  ];

  // Initialize Speech Recognition on Mount
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = appState.speakerLang === "en" ? "en-US" : "ko-KR";

      rec.onresult = async (event: any) => {
        const results = event.results;
        const latestResult = results[results.length - 1];
        const transcriptText = latestResult[0].transcript;
        const isFinalResult = latestResult.isFinal;

        if (isFinalResult) {
          try {
            // Post finished subtitle to server
            await fetch("/api/subtitles/add", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                original: transcriptText,
                translated: transcriptText,
                timestamp: currentVideoTime || 5,
                speaker: appState.speakerLang === "en" ? "Dr. Robert (Mic)" : "의학연자 (Mic)",
                isFinal: true
              })
            });

            // Trigger parent state reload
            const stateRes = await fetch("/api/state");
            const stateData = await stateRes.json();
            onUpdateState({ subtitles: stateData.subtitles });
          } catch (error) {
            console.error("Speech Recognition saving failed:", error);
          }
        }
      };

      rec.onend = () => {
        setMicActive(false);
      };

      recognitionRef.current = rec;
    }
  }, [appState.speakerLang, currentVideoTime]);

  const toggleMic = () => {
    if (!recognitionRef.current) {
      alert("죄송합니다. 현재 브라우저는 Web Speech API를 지원하지 않거나 마이크 권한이 차단되어 있습니다. Chrome 브라우저를 적극 권장합니다.");
      return;
    }

    if (micActive) {
      recognitionRef.current.stop();
      setMicActive(false);
    } else {
      recognitionRef.current.lang = appState.speakerLang === "en" ? "en-US" : "ko-KR";
      recognitionRef.current.start();
      setMicActive(true);
    }
  };

  // Live simulation loop
  const toggleSimulation = () => {
    if (isSimulating) {
      if (simTimerRef.current) clearInterval(simTimerRef.current);
      setIsSimulating(false);
    } else {
      setIsSimulating(true);
      const channelScript = appState.speakerLang === "en" ? mockEnChannelScript : mockKoChannelScript;
      let currentIndex = 0;

      // Clear existing first to make it a clean live simulation demo
      fetch("/api/subtitles/clear", { method: "POST" })
        .then(() => {
          onUpdateState({ subtitles: [] });
          
          simTimerRef.current = setInterval(async () => {
            if (currentIndex >= channelScript.length) {
              if (simTimerRef.current) clearInterval(simTimerRef.current);
              setIsSimulating(false);
              return;
            }

            const currentSpeech = channelScript[currentIndex];
            const source = appState.speakerLang;

            try {
              // Add subtitle
              await fetch("/api/subtitles/add", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  original: currentSpeech.text,
                  translated: currentSpeech.translated,
                  timestamp: currentSpeech.time,
                  speaker: source === "en" ? "Dr. Robert (AI)" : "의학연자 (AI)",
                  isFinal: true
                })
              });

              // Pull fresh state
              const stateRes = await fetch("/api/state");
              const stateData = await stateRes.json();
              onUpdateState({ subtitles: stateData.subtitles });
              
              currentIndex++;
              setSimIndex(currentIndex);
            } catch (error) {
              console.error(error);
            }
          }, 4500); // Push sentence every 4.5 seconds
        });
    }
  };

  useEffect(() => {
    return () => {
      if (simTimerRef.current) clearInterval(simTimerRef.current);
    };
  }, []);

  // Update existing subtitle text inline
  const handleStartEdit = (sub: Subtitle) => {
    setEditingSubId(sub.id);
    setEditOrigText(sub.original);
    setEditTransText(sub.translated);
  };

  const handleSaveEdit = async (id: string) => {
    try {
      const response = await fetch("/api/subtitles/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, original: editOrigText, translated: editTransText })
      });
      if (response.ok) {
        setEditingSubId(null);
        // Refresh state
        const stateRes = await fetch("/api/state");
        const stateData = await stateRes.json();
        onUpdateState({ subtitles: stateData.subtitles });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Add new arbitrary subtitle
  const handleAddManualSubtitle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrigText.trim()) return;

    try {
      const trans = newTransText.trim() || newOrigText;

      const addRes = await fetch("/api/subtitles/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          original: newOrigText,
          translated: trans,
          timestamp: currentVideoTime || 0,
          speaker: appState.speakerLang === "en" ? "Dr. Robert" : "의학 연자",
          isFinal: true
        })
      });

      if (addRes.ok) {
        setNewOrigText("");
        setNewTransText("");
        // Reload
        const stateRes = await fetch("/api/state");
        const stateData = await stateRes.json();
        onUpdateState({ subtitles: stateData.subtitles });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Dictionary creation
  const handleAddDictionary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dictTerm.trim() || !dictDef.trim()) return;

    try {
      const response = await fetch("/api/dictionary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ term: dictTerm, definition: dictDef, category: dictCat })
      });
      if (response.ok) {
        setDictTerm("");
        setDictDef("");
        onRefreshDictionary();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearAllSubtitles = async () => {
    if (confirm("송출된 모든 자막 스트림을 초기화하시겠습니까?")) {
      await fetch("/api/subtitles/clear", { method: "POST" });
      onUpdateState({ subtitles: [] });
    }
  };

  return (
    <div className="space-y-6">
      
      {/* SECTION 1: GLOBAL CONTROL PANEL */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
          <Settings className="w-4 h-4 text-indigo-600" />
          의학 학술행사 채널 정보 제어 (CMS)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* 1. Broadcast Mode Toggle */}
          <div className="space-y-1 text-left">
            <label className="text-xs font-bold text-slate-500 block">행사 운영 모드</label>
            <div className="flex bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => onUpdateState({ broadcastMode: "live" })}
                className={`flex-1 py-1.5 rounded-md text-xs font-semibold ${appState.broadcastMode === "live" ? "bg-rose-500 text-white shadow-sm" : "text-slate-600 hover:text-slate-800"}`}
              >
                LIVE 중계
              </button>
              <button
                onClick={() => onUpdateState({ broadcastMode: "vod" })}
                className={`flex-1 py-1.5 rounded-md text-xs font-semibold ${appState.broadcastMode === "vod" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-800"}`}
              >
                VOD 다시보기
              </button>
            </div>
          </div>

          {/* 2. Speaker Language Setting */}
          <div className="space-y-1 text-left">
            <label className="text-xs font-bold text-slate-500 block">연자 발표 언어 (Source)</label>
            <div className="flex bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => {
                  onUpdateState({ speakerLang: "en" });
                  if (recognitionRef.current) recognitionRef.current.lang = "en-US";
                }}
                className={`flex-1 py-1.5 rounded-md text-xs font-semibold ${appState.speakerLang === "en" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-800"}`}
              >
                English (영어)
              </button>
              <button
                onClick={() => {
                  onUpdateState({ speakerLang: "ko" });
                  if (recognitionRef.current) recognitionRef.current.lang = "ko-KR";
                }}
                className={`flex-1 py-1.5 rounded-md text-xs font-semibold ${appState.speakerLang === "ko" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-800"}`}
              >
                한국어 (Korean)
              </button>
            </div>
          </div>

          {/* 3. Output Translation Layout */}
          <div className="space-y-1 text-left">
            <label className="text-xs font-bold text-slate-500 block">수신 자막 기본 포맷</label>
            <div className="flex bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => onUpdateState({ outputLang: "ko" })}
                className={`flex-1 py-1.5 rounded-md text-xs font-semibold ${appState.outputLang === "ko" ? "bg-indigo-600 text-white" : "text-slate-600"}`}
              >
                한국어 자막
              </button>
              <button
                onClick={() => onUpdateState({ outputLang: "en" })}
                className={`flex-1 py-1.5 rounded-md text-xs font-semibold ${appState.outputLang === "en" ? "bg-indigo-600 text-white" : "text-slate-600"}`}
              >
                영어 CC
              </button>
              <button
                onClick={() => onUpdateState({ outputLang: "both" })}
                className={`flex-1 py-1.5 rounded-md text-xs font-semibold ${appState.outputLang === "both" ? "bg-indigo-600 text-white" : "text-slate-600"}`}
              >
                동시 표출
              </button>
            </div>
          </div>

          {/* 4. Interactive Simulation & Reset Actions */}
          <div className="flex flex-col justify-end gap-1.5">
            <button
              onClick={toggleSimulation}
              className={`w-full py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${isSimulating ? "bg-rose-100 text-rose-700 hover:bg-rose-200" : "bg-cyan-50 text-cyan-700 hover:bg-cyan-100 border border-cyan-200"}`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {isSimulating ? `시뮬레이션 중단 (${simIndex}/4)` : "임상 연설 시뮬레이션 시작"}
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 2: SUBTITLE FEED & LIVE ADJUSTER */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
        <div className="flex flex-wrap justify-between items-center gap-2 mb-4 border-b border-slate-100 pb-3">
          <div className="text-left">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Languages className="w-4 h-4 text-indigo-600" />
              실시간 자막 스트림 모니터링 및 수동 교정
            </h2>
            <p className="text-[11px] text-slate-500">
              운영자가 자막을 검수하고 수동 보정하면 시청자 플레이어 CC 영역에 즉시 동기화됩니다.
            </p>
          </div>
          
          <div className="flex gap-2">
            {/* Live MIC Activation Button */}
            <button
              onClick={toggleMic}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${micActive ? "bg-rose-500 text-white animate-pulse" : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"}`}
            >
              {micActive ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
              {micActive ? "마이크 자막 송출 중" : "운영자 마이크 송출"}
            </button>

            <button
              onClick={handleClearAllSubtitles}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-lg transition border border-rose-100"
            >
              스트림 전체 리셋
            </button>
          </div>
        </div>

        {/* List of current subtitles with edit buttons */}
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1 text-left">
          {appState.subtitles.length > 0 ? (
            appState.subtitles.map((sub, index) => (
              <div 
                key={sub.id} 
                className={`p-3.5 rounded-xl border transition ${editingSubId === sub.id ? "bg-indigo-50/50 border-indigo-300" : "bg-slate-50 border-slate-200 hover:bg-slate-50/80"}`}
              >
                {editingSubId === sub.id ? (
                  /* Inline editing inputs */
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-indigo-600 uppercase">자막 수정 모드</span>
                      <span className="text-[10px] font-mono text-slate-400">Time: {Math.floor(sub.timestamp)}초</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 block">발표 원문</label>
                        <textarea
                          value={editOrigText}
                          onChange={(e) => setEditOrigText(e.target.value)}
                          rows={2}
                          className="w-full text-xs p-2 bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 block">표시 자막</label>
                        <textarea
                          value={editTransText}
                          onChange={(e) => setEditTransText(e.target.value)}
                          rows={2}
                          className="w-full text-xs p-2 bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingSubId(null)}
                        className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded"
                      >
                        취소
                      </button>
                      <button
                        onClick={() => handleSaveEdit(sub.id)}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded flex items-center gap-1"
                      >
                        <Save className="w-3.5 h-3.5" />
                        저장 및 즉시 송출
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Standard subtitle listing */
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2.5">
                        <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                          {sub.speaker}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {Math.floor(sub.timestamp / 60)}분 {Math.floor(sub.timestamp % 60)}초
                        </span>
                        {sub.isEdited && (
                          <span className="text-[10px] text-indigo-500 font-semibold flex items-center gap-0.5">
                            <Check className="w-3 h-3" />
                            운영자 보정됨
                          </span>
                        )}
                      </div>
                      
                      <div className="space-y-0.5">
                        <p className="text-xs font-medium text-slate-800 leading-relaxed">
                          {sub.original}
                        </p>
                        <p className="text-xs text-indigo-600 font-medium leading-relaxed">
                          {sub.translated}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleStartEdit(sub)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-200/50 rounded transition flex-shrink-0"
                      title="실시간 자막 교정"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-10 text-slate-400 text-xs">
              현재 가동 중인 자막 스트림이 비어 있습니다. "마이크 송출" 또는 "시뮬레이션"을 시작하거나 아래 수동 입력기를 사용하여 자막을 발생시킬 수 있습니다.
            </div>
          )}
        </div>

        {/* 3. Manual caption injector form */}
        <form onSubmit={handleAddManualSubtitle} className="mt-4 pt-3 border-t border-slate-100 flex gap-2">
          <input
            type="text"
            placeholder="발화 내용을 직접 타이핑하세요..."
            value={newOrigText}
            onChange={(e) => setNewOrigText(e.target.value)}
            className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
          />
          <input
            type="text"
            placeholder="표시 자막 입력 (비우면 원문 사용)"
            value={newTransText}
            onChange={(e) => setNewTransText(e.target.value)}
            className="w-1/3 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
          />
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1 flex-shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            자막 즉시 송출
          </button>
        </form>
      </div>

      {/* SECTION 3: DICTIONARY MANAGER */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left column: Add Term form */}
        <div className="md:col-span-1 space-y-3 border-r border-slate-100 pr-0 md:pr-6 text-left">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1">
            <BookOpen className="w-4 h-4 text-cyan-600" />
            신규 의학 용어 추가
          </h3>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            질환명, 연구명, 약물명, 연자 이름을 사전에 추가하면 실시간 자막 화면에서 즉시 하이라이팅 및 풍선 도움말로 노출됩니다.
          </p>

          <form onSubmit={handleAddDictionary} className="space-y-2.5 pt-1">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500">용어 약자 / 국영명 (Key)</label>
              <input
                type="text"
                placeholder="예: SGLT2 inhibitor"
                value={dictTerm}
                onChange={(e) => setDictTerm(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500">용어 분류</label>
              <select
                value={dictCat}
                onChange={(e) => setDictCat(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
              >
                <option value="질환명">질환명</option>
                <option value="약물군">약물군</option>
                <option value="성분명">성분명</option>
                <option value="임상지표">임상지표</option>
                <option value="임상용어">임상용어</option>
                <option value="기타">기타</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500">정의 및 학술 설명</label>
              <textarea
                placeholder="예: 신장의 포도당 재흡수를 억제하여 소변으로 포도당을 배출시켜 당 수치를 강하시키고 심장 보호 역할을 제공하는 성분."
                value={dictDef}
                onChange={(e) => setDictDef(e.target.value)}
                rows={3}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded text-xs font-bold transition flex items-center justify-center gap-1 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              학술사전 등록하기
            </button>
          </form>
        </div>

        {/* Right column: Current Dictionary View */}
        <div className="md:col-span-2 space-y-3 text-left">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1">
            등록된 학술용어 리스트 ({dictionary.length}건)
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
            {dictionary.map((item, idx) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-indigo-600 font-mono">{item.term}</span>
                    <span className="text-[9px] bg-slate-200 text-slate-600 font-semibold px-1.5 py-0.5 rounded-full">
                      {item.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed font-sans line-clamp-3">
                    {item.definition}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
