"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { FieldPath, FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { adminAuth, adminDb } from "../lib/firebaseAdmin";
import { RankedBranch, ContributionTags } from "../lib/types";

// 引入 Vertex AI (僅用於文字生成與優化 Prompt)
import { VertexAI } from "@google-cloud/vertexai";

// --- 設定區 ---
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const LOCATION = "us-central1"; // 文字模型建議使用 us-central1

// 初始化 Vertex AI
const vertexAI = new VertexAI({
  project: PROJECT_ID,
  location: LOCATION,
});

// --- 輔助函式 ---

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
    
    // 支援 png 與 jpeg
    const matches = base64String.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) return null;
    
    const extension = matches[1]; // png 或 jpeg
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, "base64");
    
    const bucket = getStorage().bucket(bucketName);
    const fileName = `covers/${userId}/${Date.now()}.${extension}`;
    const file = bucket.file(fileName);
    
    await file.save(buffer, { metadata: { contentType: `image/${extension}` } });
    await file.makePublic();
    
    return file.publicUrl();
  } catch (error) {
    console.error("Image upload failed:", error);
    return null;
  }
};

// [修改] 改用 Pollinations.ai 生成圖片 (穩定、免費、無權限問題)
const generateCoverImage = async (content: string) => {
  // 1. 先用 Vertex AI (Gemini) 產生一個優質的英文 Prompt
  // 因為 Pollinations 對英文 Prompt 的理解力最好
  let imagePrompt = content.slice(0, 100);
  try {
    const model = vertexAI.getGenerativeModel({ model: "gemini-1.5-flash-001" });
    const result = await model.generateContent(`Generate a short, vivid, descriptive English image prompt (under 30 words) for a fantasy story cover based on this content: "${content.slice(0, 300)}". Only return the prompt text.`);
    const text = result.response.candidates?.[0].content.parts[0].text;
    if (text) imagePrompt = text.trim();
  } catch (e) {
    console.warn("Prompt optimization failed, using raw text.", e);
  }

  // 2. 呼叫 Pollinations API
  // 參數說明: width/height=1280x720 (16:9), nologo=true (隱藏浮水印), seed (隨機亂數確保每次不同)
  const encodedPrompt = encodeURIComponent(`${imagePrompt} cinematic lighting, highly detailed, 8k, fantasy art style`);
  const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1280&height=720&nologo=true&seed=${Math.floor(Math.random() * 10000)}`;

  try {
    const response = await fetch(url, { 
      method: 'GET',
      // 設定 15 秒 timeout，避免卡住
      signal: AbortSignal.timeout(15000) 
    });

    if (!response.ok) throw new Error(`Pollinations API Error: ${response.statusText}`);

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");

    // 回傳 JPEG 格式的 Base64
    return `data:image/jpeg;base64,${base64}`;
  } catch (error) {
    console.error("generateCoverImage error:", error);
    return fallbackCover(content);
  }
};

// [保持原樣] Vertex AI SDK (Gemini)
const rankBranchesWithGemini = async (leadContent: string, branches: { id: string; content: string }[]) => {
  const prompt = `你是一位文學評論家。根據前導劇情，對分支進行排名 (1.創意 2.寫作 3.相關性)。回傳 JSON 陣列：[{ "rank": number, "id": string, "justification": string }]\n\n前導：${leadContent}\n分支：\n${branches.map((b) => `- (${b.id}) ${b.content}`).join("\n")}`;
  
  const defaultRanking = branches.map((b, index) => ({
    rank: index + 1,
    id: b.id,
    justification: "預設排序 (AI 未啟用或失敗)。",
  }));

  try {
    const generativeModel = vertexAI.getGenerativeModel({
      model: "gemini-1.5-flash-001", 
      generationConfig: {
        temperature: 0.7,
        responseMimeType: "application/json",
      },
    });

    const result = await generativeModel.generateContent(prompt);
    const text = result.response.candidates?.[0].content.parts[0].text;

    if (text) return JSON.parse(text) as RankedBranch[];
  } catch (error) {
    console.error("Vertex Gemini error:", error);
  }
  return defaultRanking;
};

// [保持原樣] Vertex AI SDK (Gemini)
export async function generateInspiration(storyId: string, parentContributionId: string | null) {
  let contextText = "這是一個新故事的開頭。";
  
  if (parentContributionId) {
    const parentSnap = await adminDb
      .collection("stories")
      .doc(storyId)
      .collection("contributions")
      .doc(parentContributionId)
      .get();
      
    if (parentSnap.exists) {
      contextText = parentSnap.data()?.content || contextText;
    }
  } else {
    const storySnap = await adminDb.collection("stories").doc(storyId).get();
    if (storySnap.exists) {
      contextText = storySnap.data()?.synopsis || contextText;
    }
  }

  const prompt = `根據以下劇情上下文，生成 3 個簡短、具體的「劇情發展靈感」。
請直接回傳一個 JSON 字串陣列，例如：["突然傳來一陣急促的敲門聲。", "他發現口袋裡多了一張陌生的紙條。", "窗外的雨停了，空氣中瀰漫著硫磺味。"]

上下文：
${contextText.slice(0, 500)}`;

  try {
    const generativeModel = vertexAI.getGenerativeModel({
      model: "gemini-1.5-flash-001",
      generationConfig: {
        temperature: 0.9,
        responseMimeType: "application/json",
      },
    });

    const result = await generativeModel.generateContent(prompt);
    const text = result.response.candidates?.[0].content.parts[0].text;
    
    if (text) {
      return JSON.parse(text) as string[];
    }
  } catch (error) {
    console.error("Vertex Inspiration error:", error);
    throw new Error("靈感生成失敗");
  }
  
  return ["靈感枯竭中...", "試著描述一下天氣？", "讓主角發現一個秘密。"];
}

// --- Server Actions (邏輯保持不變) ---

export async function createStory(formData: FormData) {
  const title = (formData.get("title") as string)?.trim();
  const content = (formData.get("content") as string)?.trim();
  const idToken = (formData.get("idToken") as string) ?? null;
  const user = await requireAuth(idToken);

  if (!title || !content) throw new Error("標題與內容不可空白。");

  // 1. 這裡現在會呼叫 Pollinations
  let coverImageUrl = await generateCoverImage(content);
  
  // 2. 將 Pollinations 產生的 Base64 上傳到您的 Firebase Storage
  if (coverImageUrl.startsWith("data:image")) {
    const uploadedUrl = await uploadImageToStorage(coverImageUrl, user.uid);
    // 如果上傳成功就用 Storage URL，失敗就用 Placeholder，避免 Base64 直存 Firestore
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
    isCanonical: true,
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

export async function addContribution(payload: {
  storyId: string;
  content: string;
  parentContributionId: string | null;
  idToken: string | null | undefined;
  tags?: ContributionTags;
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
    isCanonical: false,
    tags: tags ?? {},
  });

  revalidatePath(`/story/${storyId}`);
  return { id: newDoc.id };
}

export async function likeContribution(params: {
  storyId: string;
  contributionId: string;
  idToken: string | null | undefined;
}) {
  const { storyId, contributionId, idToken } = params;
  await requireAuth(idToken);

  const storyRef = adminDb.collection("stories").doc(storyId);
  const targetRef = storyRef.collection("contributions").doc(contributionId);

  const result = await adminDb.runTransaction(async (t) => {
    const targetSnap = await t.get(targetRef);
    if (!targetSnap.exists) throw new Error("找不到該貢獻。");

    const targetData = targetSnap.data()!;
    const currentLikes = (targetData.likesCount as number) || 0;
    const newLikes = currentLikes + 1;
    const parentId = targetData.parentContributionId;

    t.update(targetRef, { likesCount: newLikes });

    const PROMOTION_THRESHOLD = 5;
    
    if (parentId && newLikes >= PROMOTION_THRESHOLD) {
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
      
      const isNewChampion = newLikes > maxLikes;

      if (isNewChampion && targetSnap.id !== currentCanonicalId) {
        if (currentCanonicalId) {
          t.update(storyRef.collection("contributions").doc(currentCanonicalId), { isCanonical: false });
        }
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