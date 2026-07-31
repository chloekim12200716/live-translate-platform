import React, { useRef, useEffect, useState } from "react";
import { Play, Pause, RotateCcw, Volume2, Maximize, Layout, Settings, Download, ZoomIn, Info } from "lucide-react";
import { Subtitle, DictionaryItem } from "../types";

interface VideoPlayerProps {
  currentVideoTime: number;
  setCurrentVideoTime: (time: number) => void;
  playbackSpeed: number;
  setPlaybackSpeed: (speed: number) => void;
  subtitles: Subtitle[];
  dictionary: DictionaryItem[];
  layout: string;
  setLayout: (layout: string) => void;
  broadcastMode: string;
}

export default function VideoPlayer({
  currentVideoTime,
  setCurrentVideoTime,
  playbackSpeed,
  setPlaybackSpeed,
  subtitles,
  dictionary,
  layout,
  setLayout,
  broadcastMode
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(180); // Default simulated length is 3 minutes
  const [volume, setVolume] = useState(0.8);
  const [activeSubtitle, setActiveSubtitle] = useState<Subtitle | null>(null);
  const [ccSize, setCcSize] = useState<"sm" | "md" | "lg">("md");
  const [ccMode, setCcMode] = useState<"translated" | "original" | "both">("both");
  const [tooltipWord, setTooltipWord] = useState<string | null>(null);
  const [tooltipDef, setTooltipDef] = useState<string | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);

  // Define Slide intervals
  const slides = [
    {
      title: "대사질환 치료를 위한 이중 표적 신약",
      subtitle: "Dual-Targeting Therapy for Cardiometabolic Diseases",
      points: [
        "이중 표적 치료제의 임상 기전 및 약동학적 특성",
        "제2형 당뇨병 환자에서의 대사 기능 개선 효과",
        "SGLT2 억제제 및 GLP-1 receptor agonist 병용 가능성 검토"
      ],
      timeRange: "0s - 30s"
    },
    {
      title: "GLP-1 Receptor Agonists & Metabolic Regulation",
      subtitle: "대사 조절 및 인슐린 분비 시너지 효과",
      points: [
        "췌장 베타세포 보호 및 당화혈색소(HbA1c) 강하 작용",
        "체중 감량 및 심혈관 보호(CV benefit) 3상 임상 보고",
        "주요 이상반응(Adverse event): 소화기계 경증 증상 완화 대책"
      ],
      timeRange: "30s - 75s"
    },
    {
      title: "SGLT2 억제제(Empagliflozin) Primary Endpoint",
      subtitle: "심부전 입원 및 심혈관 사망률 감소 수치",
      points: [
        "1차 평가변수(Primary endpoint): 심혈관 사망 및 심부전 입원율 14% 유의미한 감소",
        "신장 보호 효과에 대한 후속 하위 그룹(Subgroup) 분석",
        "안정성 및 위장관 부작용 비율 대조군과 동등 수준 확인"
      ],
      timeRange: "75s - 120s"
    },
    {
      title: "신기능 보존 효과와 eGFR 모니터링",
      subtitle: "Real-world Kidney Protective Benefits",
      points: [
        "사구체 여과율(eGFR) 저하 속도의 확연한 억제 확인",
        "만성 신장 질환(CKD) 합병 당뇨병 환자 대상 가이드라인",
        "장기 복용 시 사구체 압력 정상화 메커니즘 분석"
      ],
      timeRange: "120s - 180s"
    },
    {
      title: "시신경척수염 범주질환(NMOSD) 신약전략",
      subtitle: "Neuromyelitis Optica Spectrum Disorder Care",
      points: [
        "AQP4-IgG 자가항체 양성 환자 표적 면역억제 대책",
        "재발 위험(Primary endpoint) 대조군 대비 70% 이상 유의하게 감소",
        "부작용(Adverse event) 최소화를 위한 정기 혈액 수치 모니터링"
      ],
      timeRange: "180s+"
    }
  ];

  // Sync slides with video time
  useEffect(() => {
    const time = currentVideoTime;
    if (time < 30) setActiveSlide(0);
    else if (time < 75) setActiveSlide(1);
    else if (time < 120) setActiveSlide(2);
    else if (time < 180) setActiveSlide(3);
    else setActiveSlide(4);
  }, [currentVideoTime]);

  // Sync current subtitle with time
  useEffect(() => {
    // Find the subtitle that is closest to currentVideoTime, but not past it, or currently speaking
    const active = subtitles.find(
      (sub) => currentVideoTime >= sub.timestamp && currentVideoTime < sub.timestamp + 8
    );
    setActiveSubtitle(active || null);
  }, [currentVideoTime, subtitles]);

  // Real video time tracker
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentVideoTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  // Set speed
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch((err) => console.log("Video play interrupted", err));
      }
      setIsPlaying(!isPlaying);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = parseFloat(e.target.value);
    setCurrentVideoTime(targetTime);
    if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetVol = parseFloat(e.target.value);
    setVolume(targetVol);
    if (videoRef.current) {
      videoRef.current.volume = targetVol;
    }
  };

  const downloadSlides = () => {
    const content = `[MediCast AI] Symposium Presentation Handouts\n\n` + 
      slides.map((s, idx) => `Slide ${idx+1}: ${s.title}\nSubtitle: ${s.subtitle}\n- ${s.points.join('\n- ')}\n\n`).join('');
    
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "symposium_presentation_handout.txt";
    link.click();
  };

  // Custom subtitle parser that highlights registered medical words
  const renderHighlightedText = (text: string) => {
    if (!text) return "";
    
    // Sort terms by length descending to match larger phrases first
    const sortedTerms = [...dictionary].sort((a, b) => b.term.length - a.term.length);
    
    let parts: (string | React.ReactNode)[] = [text];
    
    sortedTerms.forEach((dict) => {
      const termRegex = new RegExp(`\\b(${dict.term})\\b`, "gi");
      const newParts: (string | React.ReactNode)[] = [];
      
      parts.forEach((part) => {
        if (typeof part !== "string") {
          newParts.push(part);
          return;
        }
        
        const matches = part.split(termRegex);
        if (matches.length > 1) {
          let lastIdx = 0;
          matches.forEach((segment, index) => {
            if (index % 2 === 1) {
              newParts.push(
                <span
                  key={`${dict.term}-${index}`}
                  className="bg-cyan-500/20 text-cyan-200 border-b border-cyan-400 font-semibold cursor-help px-1 mx-0.5 rounded text-shadow-sm hover:bg-cyan-500/40 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setTooltipWord(dict.term);
                    setTooltipDef(dict.definition);
                  }}
                  title="클릭하여 설명 보기"
                >
                  {segment}
                </span>
              );
            } else if (segment) {
              newParts.push(segment);
            }
          });
        } else {
          newParts.push(part);
        }
      });
      parts = newParts;
    });
    
    return parts;
  };

  return (
    <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
      {/* Top Banner Status Bar */}
      <div className="bg-slate-950 px-4 py-2.5 flex justify-between items-center text-xs border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${broadcastMode === "live" ? "bg-rose-500 animate-pulse" : "bg-teal-500"}`}></span>
          <span className="font-medium text-slate-200 uppercase tracking-wider">
            {broadcastMode === "live" ? "LIVE Broadcast" : "VOD Replay"}
          </span>
          <span className="text-slate-500 font-mono">|</span>
          <span className="text-slate-400 font-sans font-medium">글로벌 하이브리드 의학 심포지엄</span>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={downloadSlides}
            className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded transition text-xs font-medium"
          >
            <Download className="w-3.5 h-3.5" />
            발표자료 PDF
          </button>
          <span className="text-slate-500 font-mono">CC Mode:</span>
          <div className="flex bg-slate-800 rounded p-0.5">
            <button 
              onClick={() => setCcMode("both")} 
              className={`px-1.5 py-0.5 rounded text-[10px] ${ccMode === "both" ? "bg-indigo-600 text-white font-medium" : "text-slate-400 hover:text-slate-200"}`}
            >
              통합자막
            </button>
            <button 
              onClick={() => setCcMode("translated")} 
              className={`px-1.5 py-0.5 rounded text-[10px] ${ccMode === "translated" ? "bg-indigo-600 text-white font-medium" : "text-slate-400 hover:text-slate-200"}`}
            >
              번역만
            </button>
            <button 
              onClick={() => setCcMode("original")} 
              className={`px-1.5 py-0.5 rounded text-[10px] ${ccMode === "original" ? "bg-indigo-600 text-white font-medium" : "text-slate-400 hover:text-slate-200"}`}
            >
              원문만
            </button>
          </div>
        </div>
      </div>

      {/* Main Video + Slide Grid Container */}
      <div className={`grid ${layout === "split" ? "md:grid-cols-2" : "grid-cols-1"} bg-slate-950 relative`}>
        
        {/* Panel 1: Speaker Video Feed */}
        <div className={`relative ${layout === "slide" ? "hidden" : "block"} aspect-video bg-slate-900 flex flex-col justify-center items-center group overflow-hidden`}>
          {/* Simulated presenter feed */}
          <video
            ref={videoRef}
            src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            className="w-full h-full object-cover opacity-80"
            loop
            muted
            playsInline
          />

          {/* Picture in Picture Simulated Speaker Overlay */}
          <div className="absolute top-4 left-4 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/50 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
            <span className="text-xs font-semibold text-slate-100">Active Speaker</span>
            <span className="text-[10px] text-slate-400 font-mono">(Dr. Robert C. / Cleveland Clinic)</span>
          </div>

          {/* Waveform graphic overlay simulating audio feed */}
          {isPlaying && (
            <div className="absolute bottom-16 right-4 flex items-end gap-1 h-8 bg-slate-950/40 p-2 rounded-md backdrop-blur-sm">
              <span className="w-1 bg-cyan-400 rounded-full animate-bounce" style={{ height: "40%", animationDelay: "0.1s" }}></span>
              <span className="w-1 bg-indigo-400 rounded-full animate-bounce" style={{ height: "80%", animationDelay: "0.3s" }}></span>
              <span className="w-1 bg-cyan-400 rounded-full animate-bounce" style={{ height: "50%", animationDelay: "0.2s" }}></span>
              <span className="w-1 bg-indigo-400 rounded-full animate-bounce" style={{ height: "90%", animationDelay: "0.5s" }}></span>
            </div>
          )}

          {/* Play/Pause Center Indicator */}
          {!isPlaying && (
            <button 
              onClick={togglePlay}
              className="absolute inset-0 m-auto w-16 h-16 bg-indigo-600/90 hover:bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-xl transition-all scale-100 hover:scale-105"
            >
              <Play className="w-8 h-8 fill-current ml-1" />
            </button>
          )}

          {/* Closed Captions Overlay - Absolute position inside video player */}
          <div className="absolute bottom-4 left-4 right-4 z-10">
            {activeSubtitle ? (
              <div className="bg-slate-950/90 backdrop-blur-md border border-slate-800/80 rounded-xl p-3.5 shadow-2xl flex flex-col items-center justify-center text-center max-w-2xl mx-auto">
                <span className="text-[10px] uppercase text-cyan-400 font-semibold tracking-wider mb-1">
                  CC Subtitle ({activeSubtitle.speaker}) {activeSubtitle.isEdited && <span className="text-slate-500 lowercase font-normal">(edited)</span>}
                </span>
                
                {/* Dual / Original / Translated subtitle options */}
                {(ccMode === "both" || ccMode === "original") && (
                  <p className={`font-sans leading-relaxed text-slate-300 mb-1 ${ccSize === "sm" ? "text-xs" : ccSize === "md" ? "text-sm md:text-base" : "text-base md:text-lg"}`}>
                    {renderHighlightedText(activeSubtitle.original)}
                  </p>
                )}
                {(ccMode === "both" || ccMode === "translated") && (
                  <p className={`font-sans leading-relaxed text-yellow-100 font-medium ${ccSize === "sm" ? "text-xs" : ccSize === "md" ? "text-sm md:text-base" : "text-base md:text-lg"}`}>
                    {renderHighlightedText(activeSubtitle.translated)}
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-slate-950/50 backdrop-blur-sm rounded-xl p-3 max-w-md mx-auto text-center text-slate-500 text-xs">
                {broadcastMode === "live" ? "연자의 발표 발화 대기 중..." : "자막이 제공되는 시점입니다."}
              </div>
            )}
          </div>
        </div>

        {/* Panel 2: PowerPoint Slides Feed */}
        <div className={`relative ${layout === "speaker" ? "hidden" : "block"} aspect-video bg-gradient-to-br from-slate-900 to-slate-950 p-6 flex flex-col justify-between border-l border-slate-800/40 overflow-hidden`}>
          <div className="flex justify-between items-start">
            <div className="bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded text-[10px] text-cyan-400 font-semibold uppercase tracking-widest">
              Slide Resource
            </div>
            <span className="text-[11px] text-slate-500 font-mono">{slides[activeSlide]?.timeRange}</span>
          </div>

          <div className="my-auto space-y-4">
            <div>
              <h2 className="text-lg md:text-xl font-bold text-slate-100 leading-tight">
                {slides[activeSlide]?.title}
              </h2>
              <p className="text-xs md:text-sm text-cyan-400 font-medium mt-1">
                {slides[activeSlide]?.subtitle}
              </p>
            </div>

            <div className="space-y-2 border-l-2 border-indigo-500/30 pl-4 py-1">
              {slides[activeSlide]?.points.map((point, i) => (
                <div key={i} className="flex items-start gap-2 text-xs md:text-sm text-slate-300">
                  <span className="text-indigo-400 font-bold mt-0.5">·</span>
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center text-[10px] text-slate-500 border-t border-slate-800/50 pt-2">
            <span>Clinical Trial Update Series 2026</span>
            <span className="font-mono">Slide {activeSlide + 1} / {slides.length}</span>
          </div>

          {/* Subtitle overlay inside Slide view when in Slide-only layout mode */}
          {layout === "slide" && (
            <div className="absolute bottom-4 left-4 right-4 z-10">
              {activeSubtitle ? (
                <div className="bg-slate-950/95 border border-slate-800 rounded-xl p-3.5 shadow-2xl text-center max-w-xl mx-auto">
                  {(ccMode === "both" || ccMode === "original") && (
                    <p className={`text-slate-300 ${ccSize === "sm" ? "text-xs" : ccSize === "md" ? "text-sm" : "text-base"}`}>
                      {renderHighlightedText(activeSubtitle.original)}
                    </p>
                  )}
                  {(ccMode === "both" || ccMode === "translated") && (
                    <p className={`text-yellow-100 font-semibold mt-1 ${ccSize === "sm" ? "text-xs" : ccSize === "md" ? "text-sm" : "text-base"}`}>
                      {renderHighlightedText(activeSubtitle.translated)}
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* Dictionary Definition Popover Box */}
      {tooltipWord && (
        <div className="bg-indigo-950 border border-indigo-700/50 p-4 mx-4 my-2.5 rounded-xl flex items-start gap-3 relative shadow-lg">
          <div className="bg-indigo-900 p-2 rounded-lg text-cyan-400">
            <Info className="w-5 h-5" />
          </div>
          <div className="space-y-0.5 pr-6">
            <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <span>전문 의학 용어 해설:</span>
              <span className="text-cyan-400 font-mono text-sm">{tooltipWord}</span>
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              {tooltipDef}
            </p>
          </div>
          <button 
            onClick={() => {
              setTooltipWord(null);
              setTooltipDef(null);
            }}
            className="absolute top-2 right-2 text-slate-400 hover:text-slate-200 text-sm font-bold w-5 h-5 flex items-center justify-center bg-slate-900 rounded-full"
          >
            ×
          </button>
        </div>
      )}

      {/* Customized Video Player Controls Panel */}
      <div className="bg-slate-950 px-4 py-3 flex flex-col gap-3.5 border-t border-slate-800">
        {/* Timeline Slider bar */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-slate-400 font-mono w-10">
            {Math.floor(currentVideoTime / 60)}:
            {String(Math.floor(currentVideoTime % 60)).padStart(2, "0")}
          </span>
          <input
            type="range"
            min={0}
            max={duration || 180}
            step={0.1}
            value={currentVideoTime}
            onChange={handleSeek}
            className="w-full h-1.5 rounded-lg bg-slate-800 accent-indigo-500 cursor-pointer"
          />
          <span className="text-[10px] text-slate-400 font-mono w-10">
            {Math.floor(duration / 60)}:
            {String(Math.floor(duration % 60)).padStart(2, "0")}
          </span>
        </div>

        {/* Controls Grid */}
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
              title={isPlaying ? "일시정지" : "재생"}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            
            <button
              onClick={() => {
                setCurrentVideoTime(0);
                if (videoRef.current) videoRef.current.currentTime = 0;
              }}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="처음부터 다시 시청"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Volume slider */}
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-slate-400" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 rounded-lg bg-slate-800 accent-indigo-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Layout & Font Controls */}
          <div className="flex items-center gap-4 text-xs">
            {/* Playback speed selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">속도:</span>
              <div className="flex bg-slate-800 rounded p-0.5">
                {[0.8, 1.0, 1.5, 2.0].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => setPlaybackSpeed(speed)}
                    className={`px-1.5 py-0.5 rounded text-[10px] ${playbackSpeed === speed ? "bg-indigo-600 text-white font-semibold" : "text-slate-400 hover:text-slate-200"}`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>

            {/* Subtitle Size Adjuster */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">크기:</span>
              <div className="flex bg-slate-800 rounded p-0.5">
                {(["sm", "md", "lg"] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => setCcSize(size)}
                    className={`px-2 py-0.5 rounded text-[10px] uppercase ${ccSize === size ? "bg-indigo-600 text-white font-semibold" : "text-slate-400 hover:text-slate-200"}`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Layout Changer */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">화면배치:</span>
              <div className="flex bg-slate-800 rounded p-0.5">
                <button
                  onClick={() => setLayout("split")}
                  className={`px-2 py-0.5 rounded text-[10px] flex items-center gap-1 ${layout === "split" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
                  title="분할 뷰"
                >
                  분할
                </button>
                <button
                  onClick={() => setLayout("speaker")}
                  className={`px-2 py-0.5 rounded text-[10px] flex items-center gap-1 ${layout === "speaker" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
                  title="발표자 중심"
                >
                  연자
                </button>
                <button
                  onClick={() => setLayout("slide")}
                  className={`px-2 py-0.5 rounded text-[10px] flex items-center gap-1 ${layout === "slide" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
                  title="자료 중심"
                >
                  슬라이드
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
