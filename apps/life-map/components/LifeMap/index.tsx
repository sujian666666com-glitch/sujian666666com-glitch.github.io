"use client";

import { motion } from "framer-motion";
import { Loader2, Map, Route, ShieldAlert } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ExportButton } from "@/components/LifeMap/ExportButton";
import { LifeMapCanvas } from "@/components/LifeMap/LifeMapCanvas";
import { LifeMapFilter } from "@/components/LifeMap/LifeMapFilter";
import { LifeMapLegend } from "@/components/LifeMap/LifeMapLegend";
import { LifeMapPanel } from "@/components/LifeMap/LifeMapPanel";
import { LifeMapTimeline } from "@/components/LifeMap/LifeMapTimeline";
import { UnlockPanel } from "@/components/LifeMap/UnlockPanel";
import { getInitialNodeId } from "@/lib/life-map-utils";
import { useLifeMapStore } from "@/lib/life-map-store";
import type { LifeMapPayload } from "@/types/life-map";

const UNLOCKED_KEY = "life-map-unlocked";
const TOKEN_KEY = "life-map-access-token";

export function LifeMap() {
  const [payload, setPayload] = useState<LifeMapPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [dataError, setDataError] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const dataRequestKeyRef = useRef<string | null>(null);
  const unlocked = useLifeMapStore((state) => state.unlocked);
  const accessToken = useLifeMapStore((state) => state.accessToken);
  const mapMode = useLifeMapStore((state) => state.mapMode);
  const selectedNodeId = useLifeMapStore((state) => state.selectedNodeId);
  const setMapMode = useLifeMapStore((state) => state.setMapMode);
  const setSelectedNode = useLifeMapStore((state) => state.setSelectedNode);
  const setUnlocked = useLifeMapStore((state) => state.setUnlocked);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 900px)");
    const update = () => setIsMobile(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const storedUnlocked = window.sessionStorage.getItem(UNLOCKED_KEY) === "true";
    const storedToken = window.sessionStorage.getItem(TOKEN_KEY);
    if (storedUnlocked && storedToken) {
      setUnlocked(true, storedToken);
    }
  }, [setUnlocked]);

  useEffect(() => {
    if (!unlocked || !accessToken || payload) return;
    if (dataRequestKeyRef.current === accessToken) return;
    dataRequestKeyRef.current = accessToken;
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setDataError("");
      try {
        const response = await fetch("/api/life-map/data", {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store"
        });
        const result = (await response.json()) as { ok: boolean; data?: LifeMapPayload; message?: string };
        if (!response.ok || !result.ok || !result.data) {
          window.sessionStorage.removeItem(UNLOCKED_KEY);
          window.sessionStorage.removeItem(TOKEN_KEY);
          setUnlocked(false, null);
          setPayload(null);
          dataRequestKeyRef.current = null;
          setDataError(result.message || "地图数据读取失败");
          return;
        }
        if (!cancelled) {
          setPayload(result.data);
          setSelectedNode(getInitialNodeId(result.data));
        }
      } catch {
        if (!cancelled) {
          dataRequestKeyRef.current = null;
          setDataError("地图数据读取失败");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, [accessToken, payload, setSelectedNode, setUnlocked, unlocked]);

  const selectedNode = useMemo(
    () => payload?.nodes.find((node) => node.id === selectedNodeId) ?? null,
    [payload, selectedNodeId]
  );

  function handleUnlocked(token: string) {
    window.sessionStorage.setItem(UNLOCKED_KEY, "true");
    window.sessionStorage.setItem(TOKEN_KEY, token);
    setUnlocked(true, token);
    setPayload(null);
    dataRequestKeyRef.current = null;
  }

  return (
    <main className="min-h-screen overflow-x-clip bg-[#F7F1E5] px-4 py-6 text-[#332A22] sm:px-6 lg:px-8">
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="mx-auto w-full max-w-7xl"
      >
        <header className="flex flex-col gap-5 border-b border-[#D8C5A8] pb-6 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-[7px] border border-[#D8C5A8] bg-[#FFF9EC] px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-[#B76E3C] shadow-[2px_3px_0_rgba(216,197,168,0.45)]">
              <Map size={15} />
              LifeMap v2
            </div>
            <h1 className="mt-4 max-w-3xl text-4xl font-black leading-[1.04] tracking-normal text-[#332A22] sm:text-5xl">
              暖色人生冒险手账
            </h1>
            <p className="mt-3 text-base leading-7 text-[#7A6A58]">人物关系是地图骨架，闯关路线是成长路径。</p>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[#7A6A58]">
              默认只见主要人物与主线；点击人物会高亮 TA 影响过的关卡；点击她会展开完整青春小路。
            </p>
          </div>
          {unlocked && payload ? <ExportButton targetId="life-map-export-surface" /> : null}
        </header>

        {!unlocked ? <UnlockPanel onUnlocked={handleUnlocked} /> : null}

        {unlocked ? (
          <section className="mt-6 space-y-4">
            {dataError ? (
              <div className="flex items-center gap-3 rounded-[8px] border border-[#9A4A3F]/30 bg-[#FFF9EC] p-4 text-[#9A4A3F]">
                <ShieldAlert size={18} />
                <span className="text-sm font-bold">{dataError}</span>
              </div>
            ) : null}

            {loading || !payload ? (
              <div className="grid min-h-[420px] place-items-center rounded-[8px] border border-[#D8C5A8] bg-[#FFF9EC]">
                <div className="flex items-center gap-3 text-[#7A6A58]">
                  <Loader2 className="animate-spin" size={20} />
                  <span className="font-bold">读取隐藏地图中...</span>
                </div>
              </div>
            ) : (
              <>
                <ModeTabs mapMode={mapMode} onChange={setMapMode} />
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <LifeMapFilter />
                  <LifeMapLegend />
                </div>
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
                  <LifeMapCanvas payload={payload} isMobile={isMobile} />
                  <LifeMapPanel node={selectedNode} payload={payload} />
                </div>
                <LifeMapTimeline stages={payload.stages} />
              </>
            )}
          </section>
        ) : null}
      </motion.section>
    </main>
  );
}

function ModeTabs({ mapMode, onChange }: { mapMode: "relationship" | "route"; onChange: (mode: "relationship" | "route") => void }) {
  const tabs = [
    { id: "relationship" as const, label: "人物关系", icon: Map },
    { id: "route" as const, label: "闯关路线", icon: Route }
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = mapMode === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={[
              "inline-flex items-center gap-2 rounded-t-[8px] border border-b-0 px-5 py-3 text-sm font-black transition",
              active
                ? "border-[#B76E3C] bg-[#FFF9EC] text-[#332A22] shadow-[3px_0_0_rgba(216,197,168,0.45)]"
                : "border-[#D8C5A8] bg-[#F3E8D2] text-[#7A6A58] hover:text-[#332A22]"
            ].join(" ")}
          >
            <Icon size={16} />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
