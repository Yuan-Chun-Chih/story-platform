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
      className="group glass-card relative flex flex-col overflow-hidden rounded-3xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-500/10"
    >
      <div className="relative h-56 w-full overflow-hidden">
        <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/60 to-transparent opacity-60 transition-opacity group-hover:opacity-40" />
        <Image
          src={story.coverImageUrl || "/placeholder.svg"}
          alt={story.title}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-110"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
        <div className="absolute bottom-4 left-4 z-20">
          <span className={`inline-block rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md ${story.status === 'completed' ? 'bg-emerald-500/80' : 'bg-indigo-500/80'}`}>
            {story.status === "completed" ? "Completed" : "Ongoing"}
          </span>
        </div>
      </div>
      
      <div className="flex flex-1 flex-col p-6">
        <h3 className="mb-2 text-xl font-bold text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">
          {story.title}
        </h3>
        <p className="mb-4 text-sm leading-relaxed text-slate-600 line-clamp-3">
          {story.synopsis ?? "快來成為第一個貢獻者！"}
        </p>
        
        <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center">✍️</span>
            {story.authorName}
          </div>
          <span className="text-xs text-slate-400">
            {new Date(story.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>
    </Link>
  );
}