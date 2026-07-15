import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { OfflineIndicator } from "../OfflineIndicator";

// Mock the useNetwork hook
const mockUseNetwork = vi.fn();
vi.mock("@/pwa/hooks/use-network", () => ({
  useNetwork: () => mockUseNetwork(),
}));

describe("OfflineIndicator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when online", () => {
    mockUseNetwork.mockReturnValue({
      status: "online",
      isOnline: true,
      isOffline: false,
      isSyncing: false,
      setSyncing: vi.fn(),
      setOnline: vi.fn(),
      setOffline: vi.fn(),
    });

    const { container } = render(<OfflineIndicator />);
    expect(container.firstChild).toBeNull();
  });

  it("shows offline message when offline", () => {
    mockUseNetwork.mockReturnValue({
      status: "offline",
      isOnline: false,
      isOffline: true,
      isSyncing: false,
      setSyncing: vi.fn(),
      setOnline: vi.fn(),
      setOffline: vi.fn(),
    });

    render(<OfflineIndicator />);
    expect(
      screen.getByText("You're offline — some features may be limited"),
    ).toBeInTheDocument();
  });

  it("shows syncing message when syncing", () => {
    mockUseNetwork.mockReturnValue({
      status: "syncing",
      isOnline: false,
      isOffline: false,
      isSyncing: true,
      setSyncing: vi.fn(),
      setOnline: vi.fn(),
      setOffline: vi.fn(),
    });

    render(<OfflineIndicator />);
    expect(screen.getByText("Syncing...")).toBeInTheDocument();
  });
});
