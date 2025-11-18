import Image from "next/image";
import { notFound } from "next/navigation";
import AddContributionForm from "../../../components/AddContributionForm";
import ContributionCard from "../../../components/ContributionCard";
import { db } from "../../../lib/firebase";
import { Contribution, Story } from "../../../lib/types";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";

type Props = {
  // [修復] params 現在是一個 Promise
  params: Promise<{ storyId: string }>;
};

const toDateString = (value: unknown) => {
  const ts = value as { toDate?: () => Date };
  if (ts?.toDate) return ts.toDate().toISOString();
  if (typeof value === "string") return value;
  return new Date().toISOString();
};

export default async function StoryDetailPage({ params }: Props) {
  // [修復] 必須先 await params 才能取得 storyId
  const { storyId } = await params;

  const storyRef = doc(db, "stories", storyId);
  const storySnap = await getDoc(storyRef);

  if (!storySnap.exists()) {
    notFound();
  }

  const storyData = storySnap.data();
  const story: Story = {
    id: storySnap.id,
    title: storyData?.title,
    authorId: storyData?.authorId,
    authorName: storyData?.authorName,
    createdAt: toDateString(storyData?.createdAt),
    status: storyData?.status ?? "ongoing",
    coverImageUrl: storyData?.coverImageUrl,
    firstContributionId: storyData?.firstContributionId,
    synopsis: storyData?.synopsis,
  };

  const contributionsSnap = await getDocs(
    query(collection(storyRef, "contributions"), orderBy("createdAt", "asc"))
  );
  const contributions: Contribution[] = contributionsSnap.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      content: data.content,
      authorId: data.authorId,
      authorName: data.authorName,
      createdAt: toDateString(data.createdAt),
      parentContributionId: data.parentContributionId ?? null,
      likesCount: data.likesCount ?? 0,
      isCanonical: data.isCanonical ?? false,
    };
  });

  const latestContributionId = contributions[contributions.length - 1]?.id ?? null;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1.2fr_1fr]">
        <div className="flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-indigo-600">
            Story
          </p>
          <h1 className="text-3xl font-bold text-slate-900">{story.title}</h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <span className="rounded-full bg-indigo-50 px-3 py-1 font-semibold text-indigo-700">
              {story.status === "completed" ? "已完結" : "連載中"}
            </span>
            <span>作者：{story.authorName}</span>
            <span>
              建立於 {new Date(story.createdAt).toLocaleDateString()}
            </span>
          </div>
          {story.synopsis && (
            <p className="text-slate-700">{story.synopsis}</p>
          )}
        </div>
        <div className="relative h-64 overflow-hidden rounded-2xl border border-slate-200 shadow-md">
          <Image
            src={story.coverImageUrl || "/placeholder.svg"}
            alt={story.title}
            fill
            sizes="(max-width: 768px) 100vw, 400px"
            className="object-cover"
          />
        </div>
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-slate-900">貢獻記錄</h2>
          <span className="text-sm text-slate-500">
            {contributions.length} 則貢獻
          </span>
        </div>
        <div className="flex flex-col gap-4">
          {contributions.map((contribution) => (
            <ContributionCard
              key={contribution.id}
              storyId={story.id}
              contribution={contribution}
            />
          ))}
        </div>
      </section>

      <AddContributionForm
        storyId={story.id}
        parentContributionId={latestContributionId}
      />
    </div>
  );
}