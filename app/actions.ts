"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { FieldPath, FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "../lib/firebaseAdmin";
import { RankedBranch } from "../lib/types";

const requireAuth = async (idToken: string | undefined | null) => {
  if (!idToken) {
    throw new Error("需要登入後才可操作。");
  }
  const decoded = await adminAuth.verifyIdToken(idToken);
  return {
    uid: decoded.uid,
    displayName: decoded.name ?? "匿名用戶",
    email: decoded.email ?? "",
    photoURL: decoded.picture ?? "",
  };
};

const fallbackCover = (prompt: string) =>
  `https://placehold.co/960x540/0f172a/ffffff.png?text=${encodeURIComponent(
    prompt.slice(0, 60) || "Story Cover"
  )}`;

const generateCoverImage = async (content: string) => {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY;
  const prompt = `生成一張描述以下場景的數位藝術封面圖：\n${content}`;

  if (!apiKey) {
    return fallbackCover(content);
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0:generateImage?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: {
            text: prompt,
          },
          aspectRatio: "16:9",
        }),
      }
    );

    if (!response.ok) {
      console.error("Imagen response error", await response.text());
      return fallbackCover(content);
    }

    const result = await response.json();
    const uri =
      result?.image?.base64 ||
      result?.data?.[0]?.b64_json ||
      result?.images?.[0]?.uri;

    if (uri) {
      return uri.startsWith("data:")
        ? uri
        : `data:image/png;base64,${uri}`.trim();
    }
  } catch (error) {
    console.error("generateCoverImage error", error);
  }

  return fallbackCover(content);
};

const rankBranchesWithGemini = async (
  leadContent: string,
  branches: { id: string; content: string }[]
): Promise<RankedBranch[]> => {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY;
  const prompt = `你是一位文學評論家。根據以下前導劇情，對提供的分支選項進行排名。排名標準：1. 創意性 2. 寫作質量 3. 劇情相關性。請僅回傳一個 JSON 陣列，格式為：[{ "rank": number, "id": string, "justification": string }]\n\n前導劇情：${leadContent}\n\n分支：\n${branches
    .map((b) => `- (${b.id}) ${b.content}`)
    .join("\n")}`;

  if (!apiKey) {
    return branches.map((b, index) => ({
      rank: index + 1,
      id: b.id,
      justification: "使用本地排序 (未設定 GOOGLE_GENAI_API_KEY)。",
    }));
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
          },
        }),
      }
    );

    if (!response.ok) {
      console.error("Gemini response error", await response.text());
      throw new Error("Gemini API error");
    }

    const data = await response.json();
    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ??
      data?.candidates?.[0]?.content?.parts?.[0]?.stringValue;

    if (text) {
      const parsed = JSON.parse(text);
      return parsed as RankedBranch[];
    }
  } catch (error) {
    console.error("rankBranchesWithGemini error", error);
  }

  return branches.map((b, index) => ({
    rank: index + 1,
    id: b.id,
    justification: "AI 排名失敗，採用預設順序。",
  }));
};

export async function createStory(formData: FormData) {
  const title = (formData.get("title") as string)?.trim();
  const content = (formData.get("content") as string)?.trim();
  const idToken = formData.get("idToken") as string;
  const user = await requireAuth(idToken);

  if (!title || !content) {
    throw new Error("標題與內容不可空白。");
  }

  const coverImageUrl = await generateCoverImage(content);
  const storyRef = adminDb.collection("stories").doc();
  const firstContributionRef = storyRef.collection("contributions").doc();

  await firstContributionRef.set({
    content,
    authorId: user.uid,
    authorName: user.displayName ?? "匿名用戶",
    createdAt: FieldValue.serverTimestamp(),
    parentContributionId: null,
    likesCount: 0,
    isCanonical: false,
  });

  await storyRef.set({
    title,
    authorId: user.uid,
    authorName: user.displayName ?? "匿名用戶",
    createdAt: FieldValue.serverTimestamp(),
    status: "ongoing",
    coverImageUrl,
    firstContributionId: firstContributionRef.id,
    synopsis: content.slice(0, 160),
  });

  revalidatePath("/");
  redirect(`/story/${storyRef.id}`);
}

export async function addContribution(payload: {
  storyId: string;
  content: string;
  parentContributionId: string | null;
  idToken: string | null;
}) {
  const { storyId, content, parentContributionId, idToken } = payload;
  const ensured = await requireAuth(idToken);

  if (!content.trim()) {
    throw new Error("內容不可空白。");
  }

  const contributionsRef = adminDb
    .collection("stories")
    .doc(storyId)
    .collection("contributions");

  const newDoc = await contributionsRef.add({
    content: content.trim(),
    authorId: ensured.uid,
    authorName: ensured.displayName,
    createdAt: FieldValue.serverTimestamp(),
    parentContributionId: parentContributionId ?? null,
    likesCount: 0,
    isCanonical: false,
  });

  revalidatePath(`/story/${storyId}`);
  return { id: newDoc.id };
}

export async function likeContribution(params: {
  storyId: string;
  contributionId: string;
  idToken: string | null;
}) {
  const { storyId, contributionId, idToken } = params;
  await requireAuth(idToken);

  const contributionRef = adminDb
    .collection("stories")
    .doc(storyId)
    .collection("contributions")
    .doc(contributionId);

  const likes = await adminDb.runTransaction(async (transaction) => {
    const snap = await transaction.get(contributionRef);
    if (!snap.exists) throw new Error("找不到該貢獻。");
    const current = (snap.data()?.likesCount as number | undefined) ?? 0;
    transaction.update(contributionRef, { likesCount: current + 1 });
    return current + 1;
  });

  revalidatePath(`/story/${storyId}`);
  return likes;
}

export async function getRankedBranches(contributionId: string) {
  const leadSnap = await adminDb
    .collectionGroup("contributions")
    .where(FieldPath.documentId(), "==", contributionId)
    .get();

  const leadContent = leadSnap.docs[0]?.data()?.content ?? "前導劇情內容";

  const branchesSnap = await adminDb
    .collectionGroup("contributions")
    .where("parentContributionId", "==", contributionId)
    .get();

  const branches = branchesSnap.docs.map((docSnap) => ({
    id: docSnap.id,
    content: docSnap.data().content as string,
  }));

  const ranked = await rankBranchesWithGemini(leadContent, branches);
  return ranked;
}
