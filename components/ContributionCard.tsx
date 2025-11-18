"use client";

import { useState, useTransition } from "react";
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

  const handleLike = () => {
    const user = auth.currentUser;
    startTransition(async () => {
      try {
        const idToken = await user?.getIdToken();
        const next = await likeContribution({
          storyId,
          contributionId: contribution.id,
          idToken,
        });
        setLikes(next);
      } catch (err) {
        console.error(err);
        setError("請先登入再點讚。");
      }
    });
  };

  const handleRank = async () => {
    setRankLoading(true);
    setError(null);
    try {
      const result = await getRankedBranches(contribution.id);
      setRanking(result);
    } catch (err) {
      console.error(err);
      setError("取得 AI 排名失敗，稍後再試。");
    } finally {
      setRankLoading(false);
    }
  };

  const createdAt = contribution.createdAt
    ? new Date(contribution.createdAt).toLocaleString()
    : "未知時間";

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>作者：{contribution.authorName}</span>
        <span>{createdAt}</span>
      </div>
      <p className="whitespace-pre-wrap text-slate-800">{contribution.content}</p>
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleLike}
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:-translate-y-px hover:bg-indigo-100 disabled:cursor-not-allowed"
        >
          👍 {likes}
        </button>
        <button
          onClick={handleRank}
          disabled={rankLoading}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:-translate-y-px hover:border-indigo-200 hover:text-indigo-700 disabled:cursor-not-allowed"
        >
          {rankLoading ? "AI 排名中..." : "查看分支"}
        </button>
        {error && <span className="text-sm text-rose-600">{error}</span>}
      </div>

      {ranking && (
        <div className="relative">
          <div className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm" />
          <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-slate-900">
                  AI 分支排名
                </h4>
                <button
                  className="text-sm text-slate-500 hover:text-slate-800"
                  onClick={() => setRanking(null)}
                >
                  關閉
                </button>
              </div>
              <div className="mt-4 space-y-3">
                {ranking.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <div className="flex items-center justify-between text-sm text-indigo-700">
                      <span className="font-semibold">#{item.rank}</span>
                      <span className="text-xs text-slate-500">
                        Contribution ID: {item.id}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-700">
                      {item.justification}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
