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
    <section className="mx-auto mt-12 grid w-full max-w-md place-items-center rounded-[8px] border border-[#D8C5A8] bg-[#FFF9EC] p-6 shadow-[4px_6px_0_rgba(216,197,168,0.45)] sm:p-8">
      <div className="grid h-14 w-14 place-items-center rounded-[8px] border border-[#B76E3C] bg-[#D6A84F] text-[#332A22]">
        <LockKeyhole size={24} />
      </div>
      <h2 className="mt-6 text-center text-2xl font-black text-[#332A22]">输入通关密钥</h2>
      <p className="mt-2 text-center text-sm leading-6 text-[#7A6A58]">这是一本私人冒险手账</p>
      <form className="mt-7 w-full space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="sr-only">请输入密码</span>
          <div className="flex items-center gap-3 rounded-[8px] border border-[#D8C5A8] bg-[#F7F1E5] px-4 py-3 focus-within:border-[#B76E3C]">
            <KeyRound size={18} className="text-[#7A6A58]" />
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              placeholder="请输入密码"
              className="min-w-0 flex-1 border-0 bg-transparent text-[#332A22] outline-none placeholder:text-[#7A6A58]/70"
            />
          </div>
        </label>
        {error ? <p className="text-sm font-bold text-[#9A4A3F]">{error}</p> : null}
        <button
          type="submit"
          disabled={loading || !password}
          className="w-full rounded-[8px] border border-[#B76E3C] bg-[#D6A84F] px-5 py-3.5 text-sm font-black text-[#332A22] shadow-[3px_4px_0_rgba(183,110,60,0.25)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "验证中" : "解锁人生地图"}
        </button>
      </form>
    </section>
  );
}
