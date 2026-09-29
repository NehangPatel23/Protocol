import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IosInstallCard } from "./IosInstallCard";
import { IOS_INSTALL_STORAGE_KEY } from "@/lib/pwa/iosInstall";
import * as iosInstall from "@/lib/pwa/iosInstall";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("IosInstallCard", () => {
  it("does not render when shouldShowIosInstallCard is false", async () => {
    const spy = vi
      .spyOn(iosInstall, "shouldShowIosInstallCard")
      .mockReturnValue(false);
    render(<IosInstallCard />);
    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(screen.queryByTestId("ios-install-card")).toBeNull();
  });

  it("renders the Share → Add to Home Screen instruction and dismisses once", async () => {
    vi.spyOn(iosInstall, "shouldShowIosInstallCard").mockReturnValue(true);
    const persist = vi
      .spyOn(iosInstall, "persistIosInstallDismissed")
      .mockImplementation(() => {});

    render(<IosInstallCard />);

    expect(
      (await screen.findByTestId("ios-install-card")).textContent,
    ).toMatch(/Add to Home Screen/);
    fireEvent.click(screen.getByTestId("ios-install-dismiss"));
    expect(persist).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("ios-install-card")).toBeNull();
  });

  it("stores dismiss on the protocol:ios-install-dismissed key", async () => {
    vi.spyOn(iosInstall, "shouldShowIosInstallCard").mockReturnValue(true);
    const store: Record<string, string> = {};
    vi.spyOn(iosInstall, "persistIosInstallDismissed").mockImplementation(
      () => {
        store[IOS_INSTALL_STORAGE_KEY] = "1";
      },
    );

    render(<IosInstallCard />);
    fireEvent.click(await screen.findByTestId("ios-install-dismiss"));
    expect(store[IOS_INSTALL_STORAGE_KEY]).toBe("1");
  });
});
