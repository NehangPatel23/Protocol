import { describe, expect, it } from "vitest";
import {
  IOS_INSTALL_STORAGE_KEY,
  isIosUserAgent,
  isStandaloneDisplay,
  persistIosInstallDismissed,
  readDismissed,
  shouldShowIosInstallCard,
  type IosInstallEnv,
} from "./iosInstall";

const IPHONE_SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const IPAD_OS =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";
const DESKTOP_CHROME =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function env(patch: Partial<IosInstallEnv> = {}): IosInstallEnv {
  return {
    ua: IPHONE_SAFARI,
    platform: "iPhone",
    maxTouchPoints: 5,
    displayModeStandalone: false,
    navigatorStandalone: false,
    dismissed: false,
    ...patch,
  };
}

describe("isIosUserAgent", () => {
  it("matches iPhone / iPod / iPad UAs", () => {
    expect(isIosUserAgent(IPHONE_SAFARI, "iPhone", 5)).toBe(true);
    expect(
      isIosUserAgent(
        "Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X)",
        "iPad",
        5,
      ),
    ).toBe(true);
    expect(
      isIosUserAgent(
        "Mozilla/5.0 (iPod touch; CPU iPhone OS 15_0 like Mac OS X)",
        "iPod",
        1,
      ),
    ).toBe(true);
  });

  it("matches iPadOS desktop UA via MacIntel + touch", () => {
    expect(isIosUserAgent(IPAD_OS, "MacIntel", 5)).toBe(true);
  });

  it("does not match desktop Mac without touch", () => {
    expect(isIosUserAgent(DESKTOP_CHROME, "MacIntel", 0)).toBe(false);
  });
});

describe("isStandaloneDisplay", () => {
  it("is true for display-mode or iOS navigator.standalone", () => {
    expect(isStandaloneDisplay(true, false)).toBe(true);
    expect(isStandaloneDisplay(false, true)).toBe(true);
    expect(isStandaloneDisplay(false, false)).toBe(false);
    expect(isStandaloneDisplay(false, undefined)).toBe(false);
  });
});

describe("shouldShowIosInstallCard", () => {
  it("shows for iPhone Safari in the browser, once", () => {
    expect(shouldShowIosInstallCard(env())).toBe(true);
  });

  it("does not show after dismiss", () => {
    expect(shouldShowIosInstallCard(env({ dismissed: true }))).toBe(false);
  });

  it("does not show when already installed (standalone)", () => {
    expect(
      shouldShowIosInstallCard(env({ displayModeStandalone: true })),
    ).toBe(false);
    expect(shouldShowIosInstallCard(env({ navigatorStandalone: true }))).toBe(
      false,
    );
  });

  it("does not show on desktop Chrome", () => {
    expect(
      shouldShowIosInstallCard(
        env({ ua: DESKTOP_CHROME, platform: "MacIntel", maxTouchPoints: 0 }),
      ),
    ).toBe(false);
  });
});

describe("dismiss persistence", () => {
  it("readDismissed is true only for the stored flag", () => {
    const store: Record<string, string> = {};
    expect(readDismissed((key) => store[key] ?? null)).toBe(false);
    persistIosInstallDismissed((key, value) => {
      store[key] = value;
    });
    expect(store[IOS_INSTALL_STORAGE_KEY]).toBe("1");
    expect(readDismissed((key) => store[key] ?? null)).toBe(true);
  });
});
