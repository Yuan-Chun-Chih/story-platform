"use client";

import { FormEvent, useState, useTransition } from "react";
import { addContribution } from "../app/actions";
import { auth } from "../lib/firebase";

type Props = {
  storyId: string;
  parentContributionId: string | null;
};

export default function AddContributionForm({ storyId, parentContributionId }: Props) {
  const [content, setContent] = useState("");
  // [新增] 角色與時間狀態
  const [characters, setCharacters] = useState("");
  const [timeline, setTimeline] = useState("");
  
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

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
          // [新增] 傳遞標籤
          tags: {
            characters: characters.split(",").map(c => c.trim()).filter(Boolean),
            timeline: timeline.trim() || undefined,
          }
        });
        setContent("");
        setCharacters("");
        setTimeline("");
        setMessage("已送出你的貢獻！");
      } catch (err) {
        console.error(err);
        setMessage("送出失敗，請稍後再試。");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4 rounded-2xl border border-dashed border-slate-300 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h4 className="text-base font-semibold text-slate-900">續寫劇情</h4>
        <span className="text-xs text-slate-500">接續 ID：{parentContributionId?.slice(0, 6) ?? "START"}</span>
      </div>
      
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="輸入下一段精彩故事..."
        className="min-h-[120px] w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 outline-none ring-indigo-100 focus:bg-white focus:ring-2"
        required
      />

      {/* [新增] 標籤輸入區 */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">登場角色 (用逗號分隔)</span>
          <input
            value={characters}
            onChange={(e) => setCharacters(e.target.value)}
            placeholder="例如：艾倫, 米卡莎"
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">時間/地點</span>
          <input
            value={timeline}
            onChange={(e) => setTimeline(e.target.value)}
            placeholder="例如：新曆 1024 年 - 黃昏"
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </label>
      </div>

      <div className="flex items-center justify-between pt-2">
        <span className="text-sm text-indigo-600">{message}</span>
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-700 disabled:opacity-50"
        >
          {pending ? "處理中..." : "送出"}
        </button>
      </div>
    </form>
  );
}