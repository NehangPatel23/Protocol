import {
  isIosUserAgent,
  readIosInstallEnvironment,
} from "@/lib/pwa/iosInstall";

export type BackupDelivery = "share" | "download";

/**
 * Deliver a backup file to the user.
 *
 * On iOS (including standalone PWAs, where `<a download>` often fails): try
 * `navigator.share({ files: [File] })` first so the system sheet can
 * "Save to Files". Fall back to a normal object-URL download on share failure
 * or on non-iOS browsers.
 */
export async function shareOrDownloadBackup(
  contents: string,
  filename: string,
  env: {
    isIos?: boolean;
    share?: (data: ShareData) => Promise<void>;
    canShare?: (data: ShareData) => boolean;
    download?: (blob: Blob, filename: string) => void;
  } = {},
): Promise<BackupDelivery> {
  const blob = new Blob([contents], { type: "application/json" });
  const file = new File([blob], filename, { type: "application/json" });

  const isIos = env.isIos ?? detectIos();
  const shareFn =
    env.share ??
    (typeof navigator !== "undefined" && typeof navigator.share === "function"
      ? (data: ShareData) => navigator.share(data)
      : undefined);
  const canShareFn =
    env.canShare ??
    (typeof navigator !== "undefined" &&
    typeof navigator.canShare === "function"
      ? (data: ShareData) => navigator.canShare(data)
      : undefined);
  const downloadFn = env.download ?? triggerAnchorDownload;

  if (isIos && shareFn) {
    const shareData: ShareData = { files: [file], title: filename };
    const allowed = canShareFn ? canShareFn(shareData) : true;
    if (allowed) {
      try {
        await shareFn(shareData);
        return "share";
      } catch (err) {
        if (isAbortError(err)) throw err;
        // Fall through to download fallback.
      }
    }
  }

  downloadFn(blob, filename);
  return "download";
}

function detectIos(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const env = readIosInstallEnvironment();
    return isIosUserAgent(env.ua, env.platform, env.maxTouchPoints);
  } catch {
    return false;
  }
}

function triggerAnchorDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === "AbortError";
}
