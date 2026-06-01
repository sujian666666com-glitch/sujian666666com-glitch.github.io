"use client";

import { FormEvent, useState } from "react";
import { KeyRound, LockKeyhole } from "lucide-react";

interface UnlockPanelProps {
  onUnlocked: (accessToken: string) => void;
}

export function UnlockPanel({ onUnlocked }: UnlockPanelProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/life-map/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
        cache: "no-store"
      });
      const result = (await response.json()) as { ok: boolean; accessToken?: string; message?: string };
      if (!response.ok || !result.ok || !result.accessToken) {
        setError(result.message || "密码错误");
        return;
      }
      onUnlocked(result.accessToken);
    } catch {
      setError("验证失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto mt-12 grid w-full max-w-md place-items-center rounded-[28px] border border-white/10 bg-white/[0.065] p-6 shadow-panel backdrop-blur-2xl sm:p-8">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-amber-200 text-slate-950 shadow-glow">
        <LockKeyhole size={24} />
      </div>
      <h2 className="mt-6 text-center text-2xl font-black text-white">输入通关密钥</h2>
      <p className="mt-2 text-center text-sm leading-6 text-slate-400">这是一个私人彩蛋页面</p>
      <form className="mt-7 w-full space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="sr-only">请输入密码</span>
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 focus-within:border-cyan-200/70">
            <KeyRound size={18} className="text-slate-500" />
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              placeholder="请输入密码"
              className="min-w-0 flex-1 border-0 bg-transparent text-white outline-none placeholder:text-slate-600"
            />
          </div>
        </label>
        {error ? <p className="text-sm font-bold text-red-200">{error}</p> : null}
        <button
          type="submit"
          disabled={loading || !password}
          className="w-full rounded-2xl bg-cyan-200 px-5 py-3.5 text-sm font-black text-slate-950 transition hover:-translate-y-0.5 hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "验证中" : "解锁人生地图"}
        </button>
      </form>
    </section>
  );
}
