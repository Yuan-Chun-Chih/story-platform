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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 py-10">
      
      {/* Hero Section 區塊美化 - 配合動態背景 */}
      <div className="flex flex-col gap-6 text-center md:text-left relative py-10 md:py-20">
        
        {/* 裝飾性背景光暈 (讓文字更清楚，避免被動態背景吃掉) */}
        <div className="absolute inset-0 -z-10 bg-white/40 blur-3xl rounded-full scale-110"></div>

        <div className="space-y-6 relative z-10">
          <p className="inline-block rounded-full bg-indigo-100/80 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.3em] text-indigo-600 backdrop-blur-sm w-fit mx-auto md:mx-0 shadow-sm border border-indigo-200/50">
            Create Together
          </p>
          
          <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 md:text-7xl drop-shadow-sm leading-tight">
            Stories that <br className="hidden md:block" />
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent animate-gradient-x">
              Come Alive
            </span>
          </h1>
          
          <p className="max-w-2xl text-lg text-slate-700 md:text-xl leading-relaxed font-medium mx-auto md:mx-0">
            發起故事、邀請朋友共同續寫，透過點讚與 <span className="inline-block border-b-2 border-indigo-400 font-bold text-indigo-700">AI 排名</span> 決定劇情走向，打造屬於社群的傳奇篇章。
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-4 relative z-10">
          <Link
            href="/story/new"
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-slate-900 px-8 py-4 text-base font-bold text-white shadow-xl shadow-slate-900/20 transition-all hover:scale-105 hover:bg-slate-800 hover:shadow-2xl"
          >
            <span className="relative z-10 flex items-center gap-2">
              <span>✨</span> 開始創作
            </span>
            <div className="absolute inset-0 -z-0 bg-gradient-to-r from-indigo-500 to-purple-600 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          </Link>
          
          {/* 此按鈕僅作視覺引導，實際行為可根據需求調整 */}
          <button className="rounded-full bg-white/60 px-8 py-4 text-base font-bold text-slate-700 shadow-sm backdrop-blur-md border border-white/50 transition-all hover:bg-white hover:text-indigo-600 hover:shadow-md">
            探索故事
          </button>
        </div>
      </div>

      {/* 錯誤訊息顯示區 */}
      {loadError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-800 backdrop-blur-sm shadow-sm">
          ⚠️ {loadError}
        </div>
      )}

      {/* 故事列表區 - 增加玻璃質感容器 */}
      <div id="stories" className="flex flex-col gap-6">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <span className="text-2xl">📚</span> 熱門故事
          </h2>
        </div>

        {stories.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white/40 p-16 text-center backdrop-blur-sm">
            <div className="mb-4 text-4xl">📝</div>
            <h3 className="text-lg font-semibold text-slate-800">還沒有故事</h3>
            <p className="text-slate-600 mt-2">成為第一位開啟冒險的作者吧！</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {stories.map((story) => (
              <StoryCard key={story.id} story={story} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}