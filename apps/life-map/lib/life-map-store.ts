"use client";

import { create } from "zustand";
import type { LifeMapFilterId } from "@/types/life-map";

interface LifeMapState {
  selectedNodeId: string | null;
  selectedFilter: LifeMapFilterId;
  selectedStageId: string | null;
  unlocked: boolean;
  accessToken: string | null;
  setSelectedNode: (id: string | null) => void;
  setFilter: (filter: LifeMapFilterId) => void;
  setStage: (stageId: string | null) => void;
  setUnlocked: (unlocked: boolean, accessToken?: string | null) => void;
}

export const useLifeMapStore = create<LifeMapState>((set) => ({
  selectedNodeId: null,
  selectedFilter: "all",
  selectedStageId: null,
  unlocked: false,
  accessToken: null,
  setSelectedNode: (id) => set({ selectedNodeId: id }),
  setFilter: (filter) => set({ selectedFilter: filter, selectedStageId: null }),
  setStage: (stageId) => set({ selectedStageId: stageId }),
  setUnlocked: (unlocked, accessToken = null) => set({ unlocked, accessToken })
}));
