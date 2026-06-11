"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type UiState = {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  activeWorkspaceId: string | null;
  searchOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setActiveWorkspaceId: (workspaceId: string | null) => void;
  setSearchOpen: (open: boolean) => void;
};

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      sidebarCollapsed: false,
      activeWorkspaceId: null,
      searchOpen: false,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setActiveWorkspaceId: (workspaceId) =>
        set({ activeWorkspaceId: workspaceId }),
      setSearchOpen: (open) => set({ searchOpen: open }),
    }),
    {
      name: "inkcuba-ui",
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        activeWorkspaceId: state.activeWorkspaceId,
      }),
    },
  ),
);
