"use client";

import { FormEvent, useState, useTransition } from "react";
import { addContribution, generateInspiration } from "../app/actions";
import { auth } from "../lib/firebase";

type Props = {
  storyId: string;
  parentContributionId: string | null;
};

export default function AddContributionForm({ storyId, parentContributionId }: Props) {
  const [content, setContent] = useState("");
  const [characters, setCharacters] = useState("");
  const [timeline, setTimeline] = useState("");
  
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  // [新增] 靈感骰子狀態
  const [inspirations, setInspirations] = useState<string[]>([]);
  const [isRolling, setIsRolling] = useState(false);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) {
      setMessage("請先登入。");
      return;
    }

    startTransition(async () => {
      try {
        const idToken = await user.getIdToken();
        await addContribution({
          storyId,
          content,
          parentContributionId,
          idToken,
          tags: {
            characters: characters.split(",").map(c => c.trim()).filter(Boolean),
            timeline: timeline.trim() || undefined,
          }
        });
        setContent("");
        setCharacters("");
        setTimeline("");
        setInspirations([]); // 清空靈感
        setMessage("已送出你的貢獻！");
      } catch (err) {
        console.error(err);
        setMessage("送出失敗，請稍後再試。");
      }
    });
  };

  // [新增] 擲骰子邏輯
  const handleRollDice = async () => {
    setIsRolling(true);
    setInspirations([]);
    try {
      const results = await generateInspiration(storyId, parentContributionId);
      setInspirations(results);
    } catch (err) {
      console.error(err);
      setMessage("靈感生成失敗，請稍後再試。");
    } finally {
      setIsRolling(false);
    }
  };

  // [新增] 插入靈感邏輯
  const insertInspiration = (text: string) => {
    // 簡單的插入邏輯：如果框內有字，先加換行
    const prefix = content.length > 0 ? "\n" : "";
    setContent((prev) => prev + prefix + text);
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4 rounded-2xl border border-white/50 bg-white/60 p-6 shadow-xl shadow-slate-200/50 backdrop-blur-md transition-all hover:shadow-2xl hover:bg-white/80">
      
      {/* 標題區 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="text-base font-bold text-slate-800">續寫劇情</h4>
          {/* [新增] 骰子按鈕 */}
          <button
            type="button"
            onClick={handleRollDice}
            disabled={isRolling}
            className="group relative flex items-center justify-center rounded-full bg-indigo-50 p-2 text-indigo-600 transition-all hover:bg-indigo-100 hover:scale-110 disabled:opacity-50"
            title="AI 靈感骰子"
          >
            <span className={`text-lg ${isRolling ? "animate-spin" : ""}`}>🎲</span>
            {isRolling && <span className="absolute -right-1 -top-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span></span>}
          </button>
        </div>
        <span className="text-xs font-mono text-slate-400">Target: {parentContributionId?.slice(0, 6) ?? "ROOT"}</span>
      </div>

      {/* [新增] 靈感顯示區 */}
      {inspirations.length > 0 && (
        <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-2">
          {inspirations.map((insp, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => insertInspiration(insp)}
              className="rounded-lg border border-indigo-100 bg-indigo-50/50 px-3 py-1.5 text-xs text-indigo-700 transition-colors hover:bg-indigo-100 hover:text-indigo-900 text-left"
            >
              ✨ {insp}
            </button>
          ))}
        </div>
      )}
      
      {/* 輸入框 */}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="接下來會發生什麼事？..."
        className="min-h-[140px] w-full rounded-xl border border-slate-200 bg-white/50 p-4 text-base text-slate-800 placeholder:text-slate-400 outline-none ring-indigo-100 transition-all focus:bg-white focus:ring-2 focus:shadow-inner"
        required
      />

      {/* 標籤輸入區 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Characters</span>
          <input
            value={characters}
            onChange={(e) => setCharacters(e.target.value)}
            placeholder="艾倫, 米卡莎"
            className="rounded-lg border border-slate-200 bg-white/50 px-3 py-2 text-sm outline-none transition-all focus:bg-white focus:ring-2 focus:ring-indigo-100"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Timeline / Location</span>
          <input
            value={timeline}
            onChange={(e) => setTimeline(e.target.value)}
            placeholder="新曆 1024 年 - 黃昏"
            className="rounded-lg border border-slate-200 bg-white/50 px-3 py-2 text-sm outline-none transition-all focus:bg-white focus:ring-2 focus:ring-indigo-100"
          />
        </label>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-100/50">
        <span className="text-sm font-medium text-indigo-600 animate-pulse">{message}</span>
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-slate-900 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-slate-900/20 transition-all hover:bg-slate-800 hover:translate-y-[-1px] hover:shadow-slate-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pending ? "處理中..." : "送出貢獻"}
        </button>
      </div>
    </form>
  );
}