// lib/types.ts
export type Story = {
  id: string;
  title: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  status: "ongoing" | "completed";
  coverImageUrl: string;
  firstContributionId?: string;
  synopsis?: string;
};

export type ContributionTags = {
  characters: string[]; // 登場角色
  timeline?: string;    // 時間點
  location?: string;    // 地點
};

export type Contribution = {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  parentContributionId: string | null;
  likesCount: number;
  isCanonical: boolean; // 是否為主線
  tags?: ContributionTags; // [新增] 標籤資料
};

export type RankedBranch = {
  rank: number;
  id: string;
  justification: string;
};