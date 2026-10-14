"use client";

import { Download, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { useAlerts } from "@/components/alerts/AlertProvider";
import {
  BackupError,
  backupFilename,
  buildBackupFile,
  previewRestore,
  restoreBackup,
  serializeBackup,
  shareOrDownloadBackup,
  type RestorePreview,
} from "@/lib/backup";

export function DataBackupSection() {
  const alerts = useAlerts();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [pendingRaw, setPendingRaw] = useState<string | null>(null);
  const [preview, setPreview] = useState<RestorePreview | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    setError(null);
    try {
      const backup = await buildBackupFile();
      const contents = serializeBackup(backup);
      const filename = backupFilename();
      const delivery = await shareOrDownloadBackup(contents, filename);
      alerts.success(
        delivery === "share"
          ? "Use Save to Files in the share sheet to keep your backup."
          : "Backup file saved to your downloads.",
        { title: "Backup ready" },
      );
    } catch (err) {
      if (isAbort(err)) return;
      console.error("[protocol/backup] export failed", err);
      alerts.danger("Couldn’t export a backup.", { title: "Export failed" });
    } finally {
      setExporting(false);
    }
  }

  async function handleFilePicked(file: File | undefined) {
    if (!file) return;
    setError(null);
    setPreview(null);
    setPendingRaw(null);
    try {
      const text = await file.text();
      const nextPreview = await previewRestore(text);
      setPendingRaw(text);
      setPreview(nextPreview);
    } catch (err) {
      const message =
        err instanceof BackupError
          ? err.message
          : "Couldn’t read that backup file.";
      setError(message);
      alerts.danger(message, { title: "Restore blocked" });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function confirmRestore() {
    if (!pendingRaw || importing) return;
    setImporting(true);
    try {
      await restoreBackup(pendingRaw);
      alerts.success("Backup restored. Reloading…", { title: "Restore complete" });
      window.location.reload();
    } catch (err) {
      const message =
        err instanceof BackupError
          ? err.message
          : "Couldn’t restore that backup.";
      setError(message);
      alerts.danger(
        `${message} Existing data was left untouched.`,
        { title: "Restore failed" },
      );
      setPreview(null);
      setPendingRaw(null);
    } finally {
      setImporting(false);
    }
  }

  function cancelPreview() {
    setPreview(null);
    setPendingRaw(null);
  }

  return (
    <section
      className="overflow-hidden rounded-xl border border-border-subtle bg-surface"
      data-testid="settings-data-backup"
    >
      <h2 className="border-b border-border-subtle px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
        Data
      </h2>
      <div className="flex flex-col gap-4 px-4 py-4">
        <p className="text-[13px] text-secondary">
          Backups are an unencrypted local JSON file with your training history.
          Where you save or share that file is up to you — this is not a secure
          cloud backup.
        </p>
        <p className="text-[13px] text-secondary">
          Restore only works on a fresh install (no calendar days, sessions,
          exercise history, or started cycle). Merge and replace arrive later.
        </p>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            data-testid="settings-export-backup"
            disabled={exporting}
            onClick={() => void handleExport()}
            className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-border-subtle bg-base px-4 text-[14px] font-semibold text-primary disabled:opacity-60"
          >
            <Download className="h-4 w-4" aria-hidden />
            {exporting ? "Exporting…" : "Export backup"}
          </button>
          <button
            type="button"
            data-testid="settings-import-backup"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-border-subtle bg-base px-4 text-[14px] font-semibold text-primary"
          >
            <Upload className="h-4 w-4" aria-hidden />
            Restore backup
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            data-testid="settings-import-file"
            onChange={(e) => void handleFilePicked(e.target.files?.[0])}
          />
        </div>

        {error ? (
          <div
            role="alert"
            data-testid="settings-import-error"
            className="rounded-lg border border-danger/30 bg-danger-bg px-3 py-2 text-[13px] text-danger"
          >
            {error}
            <p className="mt-1 text-secondary">
              Existing data was left untouched.
            </p>
          </div>
        ) : null}
      </div>

      {preview ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-base/70 p-4 md:items-center"
          role="presentation"
          onClick={() => !importing && cancelPreview()}
        >
          <div
            role="dialog"
            aria-labelledby="restore-preview-title"
            data-testid="settings-restore-preview"
            className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-2xl border border-border-subtle bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="restore-preview-title"
              className="text-[18px] font-semibold text-primary"
            >
              Restore this backup?
            </h2>
            <dl className="mt-3 space-y-2 text-[14px]">
              <PreviewRow label="Exported" value={formatExportedAt(preview.exportedAt)} />
              <PreviewRow label="App version" value={preview.appVersion} />
              <PreviewRow
                label="Sessions"
                value={String(preview.sessionCount)}
              />
              <PreviewRow
                label="Exercise histories"
                value={String(preview.exerciseHistoryCount)}
              />
              <PreviewRow
                label="Calendar days"
                value={String(preview.calendarDayCount)}
              />
              <PreviewRow
                label="Date range"
                value={formatDateRange(preview.dateRange)}
              />
              <PreviewRow
                label="Program"
                value={
                  preview.programIncluded
                    ? "Includes your edited program"
                    : "Seed program (re-seeded on restore)"
                }
              />
              <PreviewRow
                label="Active session"
                value={preview.activeSession.reason}
              />
            </dl>
            <button
              type="button"
              data-testid="settings-restore-confirm"
              disabled={importing}
              onClick={() => void confirmRestore()}
              className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-accent text-[14px] font-bold uppercase tracking-[0.08em] text-accent-foreground disabled:opacity-60"
            >
              {importing ? "Restoring…" : "Restore backup"}
            </button>
            <button
              type="button"
              disabled={importing}
              onClick={cancelPreview}
              className="mt-2 inline-flex min-h-11 w-full items-center justify-center text-[15px] font-medium text-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border-subtle pb-2 last:border-b-0">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
        {label}
      </dt>
      <dd className="text-secondary">{value}</dd>
    </div>
  );
}

function formatExportedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function formatDateRange(range: RestorePreview["dateRange"]): string {
  if (!range.earliest && !range.latest) return "None";
  if (range.earliest === range.latest) return range.earliest ?? "None";
  return `${range.earliest} → ${range.latest}`;
}

function isAbort(err: unknown): boolean {
  return err instanceof Error && err.name === "AbortError";
}
