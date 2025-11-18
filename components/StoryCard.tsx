import Image from "next/image";
import Link from "next/link";
import { Story } from "../lib/types";

type Props = {
  story: Story;
};

export default function StoryCard({ story }: Props) {
  return (
    <Link
      href={`/story/${story.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="relative h-48 w-full overflow-hidden bg-slate-100">
        <Image
          src={story.coverImageUrl || "/placeholder.svg"}
          alt={story.title}
          fill
          className="object-cover transition duration-300 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center justify-between text-xs text-indigo-600">
          <span className="rounded-full bg-indigo-50 px-3 py-1 font-semibold">
            {story.status === "completed" ? "已完結" : "連載中"}
          </span>
          <span className="text-slate-500">
            {new Date(story.createdAt).toLocaleDateString()}
          </span>
        </div>
        <h3 className="text-lg font-semibold text-slate-900 line-clamp-2">
          {story.title}
        </h3>
        <p className="text-sm text-slate-600 line-clamp-3">
          {story.synopsis ?? "快來成為第一個貢獻者！"}
        </p>
        <div className="mt-auto text-xs text-slate-500">作者：{story.authorName}</div>
      </div>
    </Link>
  );
}
