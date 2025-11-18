"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState, useTransition } from "react";
import { createStory } from "../../actions";
import { auth } from "../../../lib/firebase";

export default function NewStoryPage() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [isSignedIn, setIsSignedIn] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      setIsSignedIn(Boolean(user));
    });
    return () => unsub();
  }, []);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const user = auth.currentUser;

    if (!user) {
      setMessage("請先使用 Google 登入後再建立故事。");
      return;
    }

    startTransition(async () => {
      try {
        const idToken = await user.getIdToken();
        const formData = new FormData();
        formData.append("title", title);
        formData.append("content", content);
        formData.append("idToken", idToken);

        await createStory(formData);
        router.push("/");
      } catch (err) {
        console.error(err);
        setMessage("建立故事失敗，請確認輸入或稍後再試。");
      }
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-indigo-600">
          New Story
        </p>
        <h1 className="text-3xl font-bold text-slate-900">建立新故事</h1>
        <p className="text-sm text-slate-600">
          提供故事標題與開場段落，我們會用 Imagen 生成封面，並自動建立首筆貢獻。
        </p>
        {!isSignedIn && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            請先登入 Google 帳號，提交表單時會使用目前登入的身分。
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-md"
      >
        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-slate-800">故事標題</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例如：遠航者的最後訊號"
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none ring-indigo-100 focus:bg-white focus:ring-2"
            required
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-slate-800">開場段落</span>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="輸入第一段內容，AI 會用它來生成封面。"
            rows={8}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none ring-indigo-100 focus:bg-white focus:ring-2"
            required
          />
        </label>
        <div className="flex items-center justify-between">
          {message && <span className="text-sm text-rose-600">{message}</span>}
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:-translate-y-[1px] hover:bg-indigo-700 disabled:cursor-not-allowed"
          >
            {pending ? "建立中..." : "建立故事"}
          </button>
        </div>
      </form>
    </div>
  );
}
