"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  GoogleAuthProvider,
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { auth, initAnalytics } from "../lib/firebase";

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    initAnalytics();
    const unsub = onAuthStateChanged(auth, (next) => {
      setUser(next);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSignIn = async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (
        error.code !== "auth/popup-closed-by-user" &&
        error.code !== "auth/cancelled-popup-request"
      ) {
        console.error("登入錯誤:", error);
        alert("登入失敗，請稍後再試。");
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-white/40 bg-white/60 backdrop-blur-xl transition-all duration-300">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="group flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30 transition-transform group-hover:scale-105">
            <span className="text-xl">✨</span>
          </div>
          <div className="flex flex-col">
            <span className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-lg font-bold text-transparent">
              Story Forge
            </span>
            <span className="text-[10px] font-medium tracking-wider text-slate-500 uppercase">
              Co-Create Worlds
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-4">
          <Link
            href="/story/new"
            className="hidden rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition-all hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-slate-900/30 sm:inline-flex"
          >
            + 建立故事
          </Link>
          
          {user ? (
            <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
              {user.photoURL ? (
                <Image
                  src={user.photoURL}
                  alt={user.displayName ?? "user"}
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-full ring-2 ring-white shadow-sm"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold">
                  {user.email?.[0]?.toUpperCase()}
                </div>
              )}
              <button
                onClick={() => signOut(auth)}
                className="text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                登出
              </button>
            </div>
          ) : (
            <button
              onClick={handleSignIn}
              disabled={loading || isSigningIn}
              className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-indigo-200 hover:text-indigo-600 hover:shadow-md"
            >
              {isSigningIn ? "登入中..." : "Google 登入"}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}