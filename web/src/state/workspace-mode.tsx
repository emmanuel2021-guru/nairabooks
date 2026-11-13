"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type WorkspaceMode = "simple" | "pro";

interface WorkspaceModeContextValue {
  readonly mode: WorkspaceMode;
  readonly setMode: (nextMode: WorkspaceMode) => void;
}

const STORAGE_KEY = "nairabooks.workspaceMode";

const WorkspaceModeContext = createContext<WorkspaceModeContextValue | null>(null);

export function WorkspaceModeProvider({
  children,
  initialMode = "simple",
}: {
  readonly children: ReactNode;
  readonly initialMode?: WorkspaceMode;
}) {
  const [mode, setModeState] = useState<WorkspaceMode>(initialMode);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "simple" || saved === "pro") {
        setModeState(saved);
      }
    } catch {
      // Ignore storage access restrictions
    }
  }, []);

  const setMode = (nextMode: WorkspaceMode) => {
    setModeState(nextMode);
    try {
      window.localStorage.setItem(STORAGE_KEY, nextMode);
    } catch {
      // Ignore storage access restrictions
    }
  };

  return (
    <WorkspaceModeContext.Provider value={{ mode, setMode }}>
      {children}
    </WorkspaceModeContext.Provider>
  );
}

export function useWorkspaceMode(): WorkspaceModeContextValue {
  const ctx = useContext(WorkspaceModeContext);
  if (!ctx) {
    throw new Error("useWorkspaceMode must be used inside WorkspaceModeProvider.");
  }
  return ctx;
}
