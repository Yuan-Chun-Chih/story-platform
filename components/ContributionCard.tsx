"use client";

import { useState, useTransition, useEffect } from "react";
import { getRankedBranches, likeContribution } from "../app/actions";
import { auth } from "../lib/firebase";
import { Contribution, RankedBranch } from "../lib/types";

type Props = {
  storyId: string;
  contribution: Contribution;
};

export default function ContributionCard({ storyId, contribution }: Props) {
  const [likes, setLikes] = useState(contribution.likesCount ?? 0);
  const [pending, startTransition] = useTransition();
  const [ranking, setRanking] = useState<RankedBranch[] | null>(null);
  const [rankLoading, setRankLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // [新增] 語音播放狀態
  const [isPlaying, setIsPlaying] = useState(false);

  // [新增] 組件卸載時停止播放，避免切換頁面還在讀
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  // [新增] 處理朗讀邏輯
  const handlePlay = () => {
    // 如果正在播放，則停止
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    // 檢查瀏覽器支援
    if (!("speechSynthesis" in window)) {
      alert("您的瀏覽器不支援語音朗讀功能。");
      return;
    }

    // 建立語音物件
    const utterance = new SpeechSynthesisUtterance(contribution.content);
    utterance.lang = "zh-TW"; // 預設繁體中文，也可改為 "zh-CN" 或自動偵測
    utterance.rate = 1.0;     // 語速 (0.1 ~ 10)
    utterance.pitch = 1.0;    // 音調 (0 ~ 2)

    // 嘗試選取更好的中文語音 (例如 Google 國語)
    const voices = window.speechSynthesis.getVoices();
    // 優先尋找 Google 或 Microsoft 的中文語音，聽起來較自然
    const preferredVoice = voices.find(
      (v) => (v.name.includes("Google") || v.name.includes("Microsoft")) && (v.lang.includes("zh-TW") || v.lang.includes("zh-CN"))
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    // 事件監聽
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = (e) => {
      console.error("Speech error:", e);
      setIsPlaying(false);
    };

    // 開始朗讀
    window.speechSynthesis.cancel(); // 先停止之前的
    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
  };

  const handleLike = () => {
    startTransition(async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          setError("請先登入再點讚。");
          return;
        }
        const idToken = await user.getIdToken();
        const next = await likeContribution({
          storyId,
          contributionId: contribution.id,
          idToken,
        });
        setLikes(next);
      } catch (err) {
        console.error(err);
        setError("點讚失敗");
      }
    });
  };

  const handleRank = async () => {
    setRankLoading(true);
    try {
      const result = await getRankedBranches(contribution.id);
      setRanking(result);
    } catch (err) {
      setError("AI 排名失敗");
    } finally {
      setRankLoading(false);
    }
  };

  // 主線樣式
  const isCanon = contribution.isCanonical;
  const containerClass = isCanon
    ? "relative bg-gradient-to-br from-amber-50 to-yellow-50/30 border-amber-200/60 shadow-lg shadow-amber-500/5"
    : "glass-card hover:shadow-lg transition-shadow duration-300";

  return (
    <div className={`flex flex-col gap-4 rounded-3xl p-6 md:p-8 ${containerClass}`}>
      
      {/* 主線標記 */}
      {isCanon && (
        <div className="absolute -top-3 -right-3">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
          </span>
          <div className="absolute top-2 right-2 -mt-1 -mr-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-3 py-1 text-[10px] font-bold text-white shadow-md uppercase tracking-wider">
            Main Canon
          </div>
        </div>
      )}

      {/* Meta 資訊 */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-3">
          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm ${isCanon ? 'bg-amber-400' : 'bg-indigo-400'}`}>
            {contribution.authorName?.[0]?.toUpperCase()}
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-slate-800">{contribution.authorName}</span>
            <span className="text-[10px] text-slate-400">{new Date(contribution.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
        
        {/* 時間標籤 */}
        <div className="flex gap-2">
          {contribution.tags?.timeline && (
            <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
              🕒 {contribution.tags.timeline}
            </span>
          )}
        </div>
      </div>

      {/* 內文區域 - 朗讀時高亮背景 */}
      <div className={`prose prose-slate max-w-none transition-colors duration-500 rounded-xl p-2 ${isPlaying ? 'bg-indigo-50/50' : ''}`}>
        <p className={`whitespace-pre-wrap text-lg leading-8 ${isCanon ? 'text-slate-900 font-medium' : 'text-slate-700'}`}>
          {contribution.content}
        </p>
      </div>

      {/* 角色標籤 */}
      {contribution.tags?.characters && contribution.tags.characters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {contribution.tags.characters.map((char, i) => (
            <span key={i} className="rounded-full border border-indigo-100 bg-indigo-50/50 px-3 py-1 text-xs font-medium text-indigo-600 transition-colors hover:bg-indigo-100">
              #{char}
            </span>
          ))}
        </div>
      )}

      {/* 操作按鈕 */}
      <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100/50">
        <button
          onClick={handleLike}
          disabled={pending}
          className={`group flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-all active:scale-95 ${
            isCanon 
              ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' 
              : 'bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-600'
          }`}
        >
          <span className="text-lg transition-transform group-hover:scale-125 group-active:scale-90">
            {isCanon ? '❤️' : '♡'}
          </span>
          <span>{likes}</span>
        </button>

        {/* [新增] 沉浸式朗讀按鈕 */}
        <button
          onClick={handlePlay}
          className={`flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition-all ${
            isPlaying
              ? "border-indigo-200 bg-indigo-50 text-indigo-700 shadow-inner"
              : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-indigo-600 hover:shadow-md"
          }`}
        >
          {isPlaying ? (
            <>
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
              </span>
              <span>朗讀中...</span>
            </>
          ) : (
            <>
              <span>🎧</span> 朗讀
            </>
          )}
        </button>

        <button
          onClick={handleRank}
          disabled={rankLoading}
          className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition-all hover:border-indigo-200 hover:text-indigo-600 hover:shadow-md"
        >
          {rankLoading ? (
            <span className="animate-pulse">✨ 分析中...</span>
          ) : (
            <>
              <span>🤖</span> AI 排名
            </>
          )}
        </button>
        {error && <span className="ml-auto text-xs font-medium text-rose-500">{error}</span>}
      </div>

      {/* AI 排名視窗 (保持原樣) */}
      {ranking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-md animate-in fade-in zoom-in duration-200">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white p-0 shadow-2xl ring-1 ring-black/5">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">🤖 AI 分支建議</h3>
                <button onClick={() => setRanking(null)} className="rounded-full bg-white/20 p-1 hover:bg-white/30">✕</button>
              </div>
              <p className="mt-1 text-xs text-indigo-100 opacity-80">根據創意、文筆與劇情連貫性評分</p>
            </div>
            
            <div className="max-h-[60vh] overflow-y-auto p-6 space-y-4">
              {ranking.map((item) => (
                <div key={item.id} className="relative overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 p-4 transition-all hover:bg-white hover:shadow-md">
                  <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-indigo-400 to-purple-400"></div>
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-2xl font-black text-slate-200">#{item.rank}</span>
                    <span className="font-mono text-[10px] text-slate-400">{item.id.slice(0,6)}</span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.justification}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}