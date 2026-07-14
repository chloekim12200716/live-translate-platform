import React, { useState } from "react";
import { MessageSquare, Send, CheckCircle2, AlertCircle, HelpCircle } from "lucide-react";
import { QAItem } from "../types";

interface QAPanelProps {
  qaList: QAItem[];
  onAddQA: (text: string, user: string) => void;
  onAnswerQA: (id: string, answer: string) => void;
  isAdmin: boolean;
}

export default function QAPanel({
  qaList,
  onAddQA,
  onAnswerQA,
  isAdmin
}: QAPanelProps) {
  const [questionText, setQuestionText] = useState("");
  const [userName, setUserName] = useState("");
  const [answerTexts, setAnswerTexts] = useState<{ [key: string]: string }>({});

  const handleSubmitQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim()) return;
    onAddQA(questionText, userName || "의학참석자 (Anonymous)");
    setQuestionText("");
    setUserName("");
  };

  const handleAnswerSubmit = (id: string) => {
    const text = answerTexts[id];
    if (!text || !text.trim()) return;
    onAnswerQA(id, text);
    setAnswerTexts({ ...answerTexts, [id]: "" });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
      <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
        <MessageSquare className="w-4.5 h-4.5 text-indigo-600" />
        임상 심포지엄 실시간 질의응답 (Q&A)
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left side: Submit a new question */}
        <div className="md:col-span-1 border-r border-slate-100 pr-0 md:pr-6 text-left space-y-3">
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-slate-700">질문 등록하기</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              발표 내용 및 이중 표적 신약 기전, 임상 수치에 대해 궁금하신 사항을 국어/영어 불문하고 올려주시면 좌장 및 연자가 답변해 드립니다.
            </p>
          </div>

          <form onSubmit={handleSubmitQuestion} className="space-y-2.5">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 block">작성자 명 (선택)</label>
              <input
                type="text"
                placeholder="예: 서울대학교 의대 박교수"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 block">질문 내용 (필수)</label>
              <textarea
                placeholder="임상 연구 또는 SGLT2, GLP-1 억제제의 약효 등에 대한 학술적 의문을 작성해 주십시오."
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                rows={4}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              질문 제출하기
            </button>
          </form>
        </div>

        {/* Right side: Q&A Board List */}
        <div className="md:col-span-2 space-y-3 text-left">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            학술 질문 피드 ({qaList.length}건)
          </h3>

          <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
            {qaList.length > 0 ? (
              [...qaList].reverse().map((qa) => (
                <div key={qa.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/60 space-y-3">
                  {/* Question header */}
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-800">{qa.user}</span>
                      <span className="text-[9px] bg-indigo-50 text-indigo-600 border border-indigo-100 px-1.5 py-0.5 rounded">
                        의료계 전문가 회원
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">{qa.timestamp}</span>
                  </div>

                  {/* Question body */}
                  <p className="text-xs text-slate-700 font-medium leading-relaxed font-sans">
                    {qa.text}
                  </p>

                  {/* Answer section */}
                  {qa.isAnswered ? (
                    <div className="bg-emerald-50/70 border border-emerald-100 p-3 rounded-lg space-y-1">
                      <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>학회 학술위원단 공식 답변</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed font-sans">
                        {qa.answer}
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {isAdmin ? (
                        /* Admin can reply */
                        <div className="flex gap-2 items-end pt-2 border-t border-slate-200">
                          <input
                            type="text"
                            placeholder="의학적 학술 해답을 작성하십시오..."
                            value={answerTexts[qa.id] || ""}
                            onChange={(e) => setAnswerTexts({ ...answerTexts, [qa.id]: e.target.value })}
                            className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
                          />
                          <button
                            onClick={() => handleAnswerSubmit(qa.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded text-xs font-bold transition flex items-center gap-1 flex-shrink-0"
                          >
                            답변등록
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium pt-1">
                          <AlertCircle className="w-3 h-3" />
                          <span>연자가 질문을 검토하고 있습니다. 답변 대기 중...</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-12 bg-slate-50 rounded-xl text-slate-400 text-xs">
                현재 등록된 학술 질문이 없습니다. 첫 질문을 가장 먼저 제출해보세요!
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
