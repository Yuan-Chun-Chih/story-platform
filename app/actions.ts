"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { FieldPath, FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { adminAuth, adminDb } from "../lib/firebaseAdmin";
import { RankedBranch, ContributionTags } from "../lib/types";

// --- 輔助函式 (保持不變) ---
const requireAuth = async (idToken: string | undefined | null) => {
  if (!idToken) throw new Error("需要登入後才可操作。");
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    return {
      uid: decoded.uid,
      displayName: decoded.name ?? "匿名用戶",
      email: decoded.email ?? "",
      photoURL: decoded.picture ?? "",
    };
  } catch (error) {
    console.error("Auth verification failed:", error);
    throw new Error("身分驗證失敗，請重新登入。");
  }
};

const fallbackCover = (prompt: string) =>
  `https://placehold.co/960x540/0f172a/ffffff.png?text=${encodeURIComponent(
    prompt.slice(0, 60) || "Story Cover"
  )}`;

const uploadImageToStorage = async (base64String: string, userId: string) => {
  try {
    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    if (!bucketName) return null;
    const base64Data = base64String.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    const bucket = getStorage().bucket(bucketName);
    const fileName = `covers/${userId}/${Date.now()}.png`;
    const file = bucket.file(fileName);
    await file.save(buffer, { metadata: { contentType: "image/png" } });
    await file.makePublic();
    return file.publicUrl();
  } catch (error) {
    console.error("Image upload failed:", error);
    return null;
  }
};

const generateCoverImage = async (content: string) => {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY;
  const prompt = `生成一張描述以下場景的數位藝術封面圖：\n${content.slice(0, 500)}`;
  if (!apiKey) return fallbackCover(content);
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instances: [{ prompt: prompt }],
          parameters: { sampleCount: 1, aspectRatio: "16:9" },
        }),
      }
    );
    if (!response.ok) return fallbackCover(content);
    const result = await response.json();
    const base64Data = result?.predictions?.[0]?.bytesBase64Encoded;
    return base64Data ? `data:image/png;base64,${base64Data}` : fallbackCover(content);
  } catch (error) {
    return fallbackCover(content);
  }
};

const rankBranchesWithGemini = async (leadContent: string, branches: { id: string; content: string }[]) => {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY;
  const prompt = `你是一位文學評論家。根據前導劇情，對分支進行排名 (1.創意 2.寫作 3.相關性)。回傳 JSON 陣列：[{ "rank": number, "id": string, "justification": string }]\n\n前導：${leadContent}\n分支：\n${branches.map((b) => `- (${b.id}) ${b.content}`).join("\n")}`;
  
  const defaultRanking = branches.map((b, index) => ({
    rank: index + 1,
    id: b.id,
    justification: "預設排序 (AI 未啟用或失敗)。",
  }));

  if (!apiKey) return defaultRanking;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, responseMimeType: "application/json" },
        }),
      }
    );
    if (!response.ok) throw new Error(await response.text());
    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) return JSON.parse(text) as RankedBranch[];
  } catch (error) {
    console.error("Gemini error:", error);
  }
  return defaultRanking;
};

// --- Server Actions ---

export async function createStory(formData: FormData) {
  const title = (formData.get("title") as string)?.trim();
  const content = (formData.get("content") as string)?.trim();
  const idToken = (formData.get("idToken") as string) ?? null;
  const user = await requireAuth(idToken);

  if (!title || !content) throw new Error("標題與內容不可空白。");

  let coverImageUrl = await generateCoverImage(content);
  if (coverImageUrl.startsWith("data:image")) {
    const uploadedUrl = await uploadImageToStorage(coverImageUrl, user.uid);
    coverImageUrl = uploadedUrl || fallbackCover(content);
  }

  const storyRef = adminDb.collection("stories").doc();
  const firstContributionRef = storyRef.collection("contributions").doc();
  const batch = adminDb.batch();

  batch.set(firstContributionRef, {
    content,
    authorId: user.uid,
    authorName: user.displayName,
    createdAt: FieldValue.serverTimestamp(),
    parentContributionId: null,
    likesCount: 0,
    isCanonical: true, // 第一章永遠是主線
    tags: {},
  });

  batch.set(storyRef, {
    title,
    authorId: user.uid,
    authorName: user.displayName,
    createdAt: FieldValue.serverTimestamp(),
    status: "ongoing",
    coverImageUrl,
    firstContributionId: firstContributionRef.id,
    synopsis: content.slice(0, 160),
  });

  await batch.commit();
  revalidatePath("/");
  redirect(`/story/${storyRef.id}`);
}

// [修改] 支援標籤輸入
export async function addContribution(payload: {
  storyId: string;
  content: string;
  parentContributionId: string | null;
  idToken: string | null | undefined;
  tags?: ContributionTags; // 新增 tags 參數
}) {
  const { storyId, content, parentContributionId, idToken, tags } = payload;
  const user = await requireAuth(idToken);

  if (!content.trim()) throw new Error("內容不可空白。");

  const contributionsRef = adminDb.collection("stories").doc(storyId).collection("contributions");
  
  const newDoc = await contributionsRef.add({
    content: content.trim(),
    authorId: user.uid,
    authorName: user.displayName,
    createdAt: FieldValue.serverTimestamp(),
    parentContributionId: parentContributionId ?? null,
    likesCount: 0,
    isCanonical: false, // 預設非主線，需競爭上位
    tags: tags ?? {},   // 儲存標籤
  });

  revalidatePath(`/story/${storyId}`);
  return { id: newDoc.id };
}

// [修改] 加入主線競爭邏輯 (Canonical Promotion)
export async function likeContribution(params: {
  storyId: string;
  contributionId: string;
  idToken: string | null | undefined;
}) {
  const { storyId, contributionId, idToken } = params;
  await requireAuth(idToken);

  const storyRef = adminDb.collection("stories").doc(storyId);
  const targetRef = storyRef.collection("contributions").doc(contributionId);

  // 使用 Transaction 處理競態條件與主線判定
  const result = await adminDb.runTransaction(async (t) => {
    const targetSnap = await t.get(targetRef);
    if (!targetSnap.exists) throw new Error("找不到該貢獻。");

    const targetData = targetSnap.data()!;
    const currentLikes = (targetData.likesCount as number) || 0;
    const newLikes = currentLikes + 1;
    const parentId = targetData.parentContributionId;

    // 更新當前節點按讚數
    t.update(targetRef, { likesCount: newLikes });

    // --- 主線晉升判斷邏輯 ---
    // 條件 1: 必須有父節點 (Root 預設就是主線，不需競爭)
    // 條件 2: 按讚數達到門檻 (例如 5)
    const PROMOTION_THRESHOLD = 5;
    
    if (parentId && newLikes >= PROMOTION_THRESHOLD) {
      // 找出所有同層兄弟節點 (Same parent)
      const siblingsSnap = await t.get(
        storyRef.collection("contributions").where("parentContributionId", "==", parentId)
      );

      let maxLikes = 0;
      let currentCanonicalId: string | null = null;

      siblingsSnap.forEach((doc) => {
        const data = doc.data();
        if (data.likesCount > maxLikes) maxLikes = data.likesCount;
        if (data.isCanonical) currentCanonicalId = doc.id;
      });

      // 如果當前節點是新的最高票 (嚴格大於，避免平手切換)，則晉升
      // 注意：這裡的 maxLikes 是包含自己的舊值，所以要比較 newLikes 是否大於其他人的 max
      // 簡單起見：如果 newLikes > 目前已知的最高票 (不含自己更新後)，或它是唯一最高
      
      const isNewChampion = newLikes > maxLikes; // 簡單判定：只要比 transaction 讀取到的舊 max 還大 (若自己原本就是 max，則沒變；若別人是 max，則超越)

      if (isNewChampion && targetSnap.id !== currentCanonicalId) {
        // 1. 取消舊主線
        if (currentCanonicalId) {
          t.update(storyRef.collection("contributions").doc(currentCanonicalId), { isCanonical: false });
        }
        // 2. 設定新主線
        t.update(targetRef, { isCanonical: true });
      }
    }

    return newLikes;
  });

  revalidatePath(`/story/${storyId}`);
  return result;
}

export async function getRankedBranches(contributionId: string) {
  const leadSnap = await adminDb.collectionGroup("contributions").where(FieldPath.documentId(), "==", contributionId).get();
  if (leadSnap.empty) throw new Error("找不到前導貢獻");
  
  const leadContent = leadSnap.docs[0].data().content as string;
  const branchesSnap = await adminDb.collectionGroup("contributions").where("parentContributionId", "==", contributionId).get();
  const branches = branchesSnap.docs.map((docSnap) => ({ id: docSnap.id, content: docSnap.data().content as string }));

  if (branches.length === 0) return [];
  return await rankBranchesWithGemini(leadContent, branches);
}