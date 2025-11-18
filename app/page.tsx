import Link from "next/link";
import StoryCard from "../components/StoryCard";
import { db } from "../lib/firebase";
import { Story } from "../lib/types";
import { collection, getDocs, orderBy, query } from "firebase/firestore";

const toDateString = (value: unknown) => {
  const ts = value as { toDate?: () => Date };
  if (ts?.toDate) return ts.toDate().toISOString();
  if (typeof value === "string") return value;
  return new Date().toISOString();
};

export default async function Home() {
  let stories: Story[] = [];
  let loadError: string | null = null;

  try {
    const storiesSnap = await getDocs(
      query(collection(db, "stories"), orderBy("createdAt", "desc"))
    );

    stories = storiesSnap.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        title: data.title as string,
        authorId: data.authorId as string,
        authorName: data.authorName as string,
        createdAt: toDateString(data.createdAt),
        status: (data.status as Story["status"]) ?? "ongoing",
        coverImageUrl: (data.coverImageUrl as string) ?? "",
        firstContributionId: data.firstContributionId as string | undefined,
        synopsis: (data.synopsis as string) ?? "",
      };
    });
  } catch (err) {
    console.error("Failed to load stories", err);
    loadError = "無法讀取故事列表，請確認 Firestore 規則或用戶端金鑰設定。";
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10">
      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-indigo-600">
          Discover
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold text-slate-900">
            線上共創故事平台
          </h1>
          <Link
            href="/story/new"
            className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:-translate-y-[1px] hover:bg-indigo-700"
          >
            建立新故事
          </Link>
        </div>
        <p className="text-sm text-slate-600">
          發起故事、邀請朋友共同續寫，透過點讚與 AI 排名決定劇情走向。
        </p>
        {loadError && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {loadError}
          </div>
        )}
      </div>

      {stories.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-slate-600">
          還沒有故事，成為第一位作者吧！
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {stories.map((story) => (
            <StoryCard key={story.id} story={story} />
          ))}
        </div>
      )}
    </div>
  );
}
