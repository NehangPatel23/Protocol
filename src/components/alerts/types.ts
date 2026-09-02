import type { LucideIcon } from "lucide-react";

export type AlertTone = "success" | "warning" | "danger" | "info";

export interface AlertAction {
  label: string;
  onClick: () => void | Promise<void>;
}

export interface AlertOptions {
  id?: string;
  tone?: AlertTone;
  title?: string;
  message: string;
  /** Auto-dismiss ms. `null` = persistent (save-failed). Defaults by tone. */
  durationMs?: number | null;
  action?: AlertAction;
  icon?: LucideIcon;
}

export interface AlertItem extends Required<Pick<AlertOptions, "tone" | "message">> {
  id: string;
  title?: string;
  durationMs: number | null;
  action?: AlertAction;
  icon?: LucideIcon;
  createdAt: number;
}

export const ALERT_DEFAULT_DURATION: Record<AlertTone, number | null> = {
  success: 3200,
  info: 4000,
  warning: 5000,
  danger: null,
};
