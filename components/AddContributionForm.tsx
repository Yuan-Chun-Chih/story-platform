"use client";

import { FormEvent, useState, useTransition } from "react";
import { addContribution } from "../app/actions";
import { auth } from "../lib/firebase";

type Props = {
  storyId: string;
  parentContributionId: string | null;
};

export default function AddContributionForm({
  storyId,
  parentContributionId,
}: Props) {
  const [content, setContent] = useState("");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const user = auth.currentUser;
    if (!user) {
      setMessage("請先登入並輸入內容。");
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
        });
        setContent("");
        setMessage("已送出你的貢獻！");
      } catch (err) {
        console.error(err);
        setMessage("請先登入並輸入內容。");
      }
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-6 flex flex-col gap-3 rounded-2xl border border-dashed border-slate-300 bg-white p-4 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <h4 className="text-base font-semibold text-slate-900">新增貢獻</h4>
        <span className="text-xs text-slate-500">
          當前分支：{parentContributionId ?? "故事開頭"}
        </span>
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="續寫下一段劇情..."
        className="min-h-[140px] w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 outline-none ring-indigo-100 focus:bg-white focus:ring-2"
      />
      <div className="flex items-center justify-between">
        {message && <span className="text-sm text-indigo-600">{message}</span>}
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-200 transition hover:-translate-y-px hover:bg-indigo-700 disabled:cursor-not-allowed"
        >
          {pending ? "送出中..." : "送出貢獻"}
        </button>
      </div>
    </form>
  );
}
