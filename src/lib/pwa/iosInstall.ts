/** iOS has no native install prompt — Master Prompt §6.13 */

export const IOS_INSTALL_STORAGE_KEY = "protocol:ios-install-dismissed";

export interface IosInstallEnv {
  ua: string;
  platform: string;
  maxTouchPoints: number;
  displayModeStandalone: boolean;
  navigatorStandalone: boolean | undefined;
  dismissed: boolean;
}

export function isIosUserAgent(
  ua: string,
  platform: string,
  maxTouchPoints: number,
): boolean {
  if (/iPad|iPhone|iPod/i.test(ua)) return true;
  // iPadOS 13+ reports as desktop Safari.
  if (platform === "MacIntel" && maxTouchPoints > 1) return true;
  return false;
}

export function isStandaloneDisplay(
  displayModeStandalone: boolean,
  navigatorStandalone: boolean | undefined,
): boolean {
  return displayModeStandalone || navigatorStandalone === true;
}

export function shouldShowIosInstallCard(env: IosInstallEnv): boolean {
  if (env.dismissed) return false;
  if (isStandaloneDisplay(env.displayModeStandalone, env.navigatorStandalone)) {
    return false;
  }
  return isIosUserAgent(env.ua, env.platform, env.maxTouchPoints);
}

export function readDismissed(getItem: (key: string) => string | null): boolean {
  try {
    return getItem(IOS_INSTALL_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function readIosInstallEnvironment(): IosInstallEnv {
  const nav = window.navigator as Navigator & { standalone?: boolean };
  let displayModeStandalone = false;
  try {
    displayModeStandalone = window.matchMedia(
      "(display-mode: standalone)",
    ).matches;
  } catch {
    displayModeStandalone = false;
  }
  let dismissed = false;
  try {
    dismissed = readDismissed((key) => localStorage.getItem(key));
  } catch {
    dismissed = false;
  }
  return {
    ua: nav.userAgent,
    platform: nav.platform,
    maxTouchPoints: nav.maxTouchPoints ?? 0,
    displayModeStandalone,
    navigatorStandalone: nav.standalone,
    dismissed,
  };
}

export function persistIosInstallDismissed(
  setItem: (key: string, value: string) => void = (key, value) =>
    localStorage.setItem(key, value),
): void {
  try {
    setItem(IOS_INSTALL_STORAGE_KEY, "1");
  } catch {
    /* private browsing — caller still hides the card for this visit */
  }
}
