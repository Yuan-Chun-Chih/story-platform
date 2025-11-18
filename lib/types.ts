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

export type Contribution = {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  parentContributionId: string | null;
  likesCount: number;
  isCanonical: boolean;
};

export type RankedBranch = {
  rank: number;
  id: string;
  justification: string;
};
