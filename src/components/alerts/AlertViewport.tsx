"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
  XCircle,
} from "lucide-react";
import { useAlerts } from "@/components/alerts/AlertProvider";
import type { AlertItem, AlertTone } from "@/components/alerts/types";

const TONE_STYLES: Record<
  AlertTone,
  { shell: string; icon: string; action: string; DefaultIcon: typeof Info }
> = {
  success: {
    shell: "border-success/35 bg-success-bg text-success",
    icon: "text-success",
    action:
      "bg-success text-[color:var(--bg-base)] hover:opacity-90 dark:text-[#0B2E24]",
    DefaultIcon: CheckCircle2,
  },
  warning: {
    shell: "border-warning/35 bg-warning-bg text-warning",
    icon: "text-warning",
    action: "bg-warning text-[#3A2A0B] hover:opacity-90",
    DefaultIcon: AlertTriangle,
  },
  danger: {
    shell: "border-danger/40 bg-danger-bg text-danger",
    icon: "text-danger",
    action: "bg-danger text-[#3A0E14] hover:opacity-90",
    DefaultIcon: XCircle,
  },
  info: {
    shell: "border-info/35 bg-info-bg text-info",
    icon: "text-info",
    action: "bg-info text-[#0B2036] hover:opacity-90",
    DefaultIcon: Info,
  },
};

function AlertCard({
  alert,
  onDismiss,
}: {
  alert: AlertItem;
  onDismiss: (id: string) => void;
}) {
  const style = TONE_STYLES[alert.tone];
  const Icon = alert.icon ?? style.DefaultIcon;
  const persistent = alert.durationMs == null;

  return (
    <div
      role="status"
      aria-live={alert.tone === "danger" ? "assertive" : "polite"}
      className={`protocol-alert pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border px-3.5 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.35)] backdrop-blur-sm ${style.shell}`}
    >
      <Icon
        className={`mt-0.5 h-5 w-5 shrink-0 ${style.icon}`}
        strokeWidth={2}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        {alert.title ? (
          <p className="text-[13px] font-semibold tracking-tight text-primary">
            {alert.title}
          </p>
        ) : null}
        <p
          className={`text-[14px] leading-snug ${
            alert.title ? "mt-0.5 text-secondary" : "font-medium text-primary"
          }`}
        >
          {alert.message}
        </p>
        {alert.action ? (
          <button
            type="button"
            className={`mt-2.5 inline-flex min-h-9 items-center rounded-lg px-3 text-[12px] font-bold uppercase tracking-[0.08em] transition-opacity ${style.action}`}
            onClick={() => {
              void Promise.resolve(alert.action?.onClick()).finally(() => {
                if (!persistent) onDismiss(alert.id);
              });
            }}
          >
            {alert.action.label}
          </button>
        ) : null}
      </div>
      {!persistent || !alert.action ? (
        <button
          type="button"
          onClick={() => onDismiss(alert.id)}
          className="inline-flex min-h-9 min-w-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-base/40 hover:text-primary"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

/** Bottom-anchored alert stack — Design Spec toast / save-failed patterns */
export function AlertViewport() {
  const { alerts, dismiss } = useAlerts();

  if (alerts.length === 0) return null;

  return (
    <div
      className="protocol-alert-viewport pointer-events-none fixed inset-x-0 z-[90] flex flex-col items-center gap-2 px-4"
    >
      <div className="flex w-full max-w-md flex-col-reverse gap-2">
        {alerts.map((alert) => (
          <AlertCard key={alert.id} alert={alert} onDismiss={dismiss} />
        ))}
      </div>
    </div>
  );
}
