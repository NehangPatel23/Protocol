"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertViewport } from "@/components/alerts/AlertViewport";
import {
  ALERT_DEFAULT_DURATION,
  type AlertItem,
  type AlertOptions,
  type AlertTone,
} from "@/components/alerts/types";

interface AlertContextValue {
  alerts: AlertItem[];
  push: (options: AlertOptions) => string;
  dismiss: (id: string) => void;
  success: (message: string, extras?: Omit<AlertOptions, "message" | "tone">) => string;
  info: (message: string, extras?: Omit<AlertOptions, "message" | "tone">) => string;
  warning: (message: string, extras?: Omit<AlertOptions, "message" | "tone">) => string;
  danger: (message: string, extras?: Omit<AlertOptions, "message" | "tone">) => string;
}

const AlertContext = createContext<AlertContextValue | null>(null);

function newId(): string {
  return `alert-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const timers = useRef<Map<string, number>>(new Map());

  const dismiss = useCallback((id: string) => {
    const t = timers.current.get(id);
    if (t != null) {
      window.clearTimeout(t);
      timers.current.delete(id);
    }
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const push = useCallback(
    (options: AlertOptions) => {
      const tone: AlertTone = options.tone ?? "info";
      const id = options.id ?? newId();
      const durationMs =
        options.durationMs !== undefined
          ? options.durationMs
          : ALERT_DEFAULT_DURATION[tone];

      const item: AlertItem = {
        id,
        tone,
        title: options.title,
        message: options.message,
        durationMs,
        action: options.action,
        icon: options.icon,
        createdAt: Date.now(),
      };

      setAlerts((prev) => {
        const withoutDup = options.id
          ? prev.filter((a) => a.id !== options.id)
          : prev;
        // Cap stack so the UI stays calm
        return [...withoutDup, item].slice(-4);
      });

      const existing = timers.current.get(id);
      if (existing != null) {
        window.clearTimeout(existing);
        timers.current.delete(id);
      }
      if (durationMs != null && durationMs > 0) {
        const handle = window.setTimeout(() => dismiss(id), durationMs);
        timers.current.set(id, handle);
      }

      return id;
    },
    [dismiss],
  );

  const api = useMemo<AlertContextValue>(
    () => ({
      alerts,
      push,
      dismiss,
      success: (message, extras) =>
        push({ ...extras, message, tone: "success" }),
      info: (message, extras) => push({ ...extras, message, tone: "info" }),
      warning: (message, extras) =>
        push({ ...extras, message, tone: "warning" }),
      danger: (message, extras) => push({ ...extras, message, tone: "danger" }),
    }),
    [alerts, push, dismiss],
  );

  return (
    <AlertContext.Provider value={api}>
      {children}
      <AlertViewport />
    </AlertContext.Provider>
  );
}

export function useAlerts(): AlertContextValue {
  const ctx = useContext(AlertContext);
  if (!ctx) {
    throw new Error("useAlerts must be used within AlertProvider");
  }
  return ctx;
}
