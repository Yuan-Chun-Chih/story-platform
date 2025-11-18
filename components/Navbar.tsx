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

  useEffect(() => {
    initAnalytics();
    const unsub = onAuthStateChanged(auth, (next) => {
      setUser(next);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  return (
    <nav className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-200">
              ✨
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-slate-900">
                Story Forge
              </span>
              <span className="text-xs text-slate-500">
                線上共創故事平台
              </span>
            </div>
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/story/new"
            className="hidden rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-200 transition hover:-translate-y-[1px] hover:bg-indigo-700 sm:inline-flex"
          >
            建立新故事
          </Link>
          {user && (
            <div className="flex items-center gap-2 rounded-full bg-slate-100 px-2 py-1">
              {user.photoURL ? (
                <Image
                  src={user.photoURL}
                  alt={user.displayName ?? "user"}
                  width={28}
                  height={28}
                  className="h-7 w-7 rounded-full object-cover"
                />
              ) : (
                <div className="h-7 w-7 rounded-full bg-indigo-500 text-center text-sm font-semibold text-white">
                  {user.email?.[0]?.toUpperCase() ?? "U"}
                </div>
              )}
              <span className="text-sm font-medium text-slate-700">
                {user.displayName ?? "使用者"}
              </span>
            </div>
          )}
          <button
            onClick={user ? handleSignOut : handleSignIn}
            disabled={loading}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:-translate-y-[1px] hover:border-indigo-200 hover:text-indigo-700"
          >
            {user ? "登出" : loading ? "載入中..." : "Google 登入"}
          </button>
        </div>
      </div>
    </nav>
  );
}
