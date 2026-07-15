import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InstallBanner } from "../InstallBanner";

// Mock the useInstall hook
const mockUseInstall = vi.fn();
vi.mock("@/pwa/hooks/use-install", () => ({
  useInstall: () => mockUseInstall(),
}));

describe("InstallBanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders nothing when installed", () => {
    mockUseInstall.mockReturnValue({
      platform: "desktop",
      canInstall: true,
      isInstalled: true,
      install: vi.fn(),
      dismiss: vi.fn(),
      wasDismissed: () => false,
    });

    const { container } = render(<InstallBanner />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when cannot install", () => {
    mockUseInstall.mockReturnValue({
      platform: "desktop",
      canInstall: false,
      isInstalled: false,
      install: vi.fn(),
      dismiss: vi.fn(),
      wasDismissed: () => false,
    });

    const { container } = render(<InstallBanner />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when dismissed", () => {
    mockUseInstall.mockReturnValue({
      platform: "desktop",
      canInstall: true,
      isInstalled: false,
      install: vi.fn(),
      dismiss: vi.fn(),
      wasDismissed: () => true,
    });

    const { container } = render(<InstallBanner />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the banner when can install and not dismissed", () => {
    mockUseInstall.mockReturnValue({
      platform: "desktop",
      canInstall: true,
      isInstalled: false,
      install: vi.fn(),
      dismiss: vi.fn(),
      wasDismissed: () => false,
    });

    render(<InstallBanner />);
    expect(screen.getByText("Install Lumen")).toBeInTheDocument();
    expect(screen.getByText("Add to your home screen for quick access")).toBeInTheDocument();
  });

  it("shows iOS-specific message for iOS platform", () => {
    mockUseInstall.mockReturnValue({
      platform: "ios",
      canInstall: true,
      isInstalled: false,
      install: vi.fn(),
      dismiss: vi.fn(),
      wasDismissed: () => false,
    });

    render(<InstallBanner />);
    expect(
      screen.getByText("Tap the share button, then 'Add to Home Screen'"),
    ).toBeInTheDocument();
  });

  it("hides install button on iOS", () => {
    mockUseInstall.mockReturnValue({
      platform: "ios",
      canInstall: true,
      isInstalled: false,
      install: vi.fn(),
      dismiss: vi.fn(),
      wasDismissed: () => false,
    });

    render(<InstallBanner />);
    expect(screen.queryByRole("button", { name: /install/i })).not.toBeInTheDocument();
  });

  it("shows install button on non-iOS platforms", () => {
    mockUseInstall.mockReturnValue({
      platform: "android",
      canInstall: true,
      isInstalled: false,
      install: vi.fn(),
      dismiss: vi.fn(),
      wasDismissed: () => false,
    });

    render(<InstallBanner />);
    expect(screen.getByRole("button", { name: /install/i })).toBeInTheDocument();
  });

  it("calls install when install button is clicked", async () => {
    const install = vi.fn();
    mockUseInstall.mockReturnValue({
      platform: "android",
      canInstall: true,
      isInstalled: false,
      install,
      dismiss: vi.fn(),
      wasDismissed: () => false,
    });

    const user = userEvent.setup();
    render(<InstallBanner />);

    await user.click(screen.getByRole("button", { name: /install/i }));
    expect(install).toHaveBeenCalled();
  });

  it("calls dismiss when dismiss button is clicked", async () => {
    const dismiss = vi.fn();
    mockUseInstall.mockReturnValue({
      platform: "desktop",
      canInstall: true,
      isInstalled: false,
      install: vi.fn(),
      dismiss,
      wasDismissed: () => false,
    });

    const user = userEvent.setup();
    render(<InstallBanner />);

    await user.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(dismiss).toHaveBeenCalled();
  });
});
