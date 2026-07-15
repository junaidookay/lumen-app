import { describe, it, expect } from "vitest";
import {
  hasRole,
  isAdmin,
  isModerator,
  isPremium,
  can,
  EMPTY_PERMISSIONS,
  type Permissions,
} from "../permissions";

const freeUser: Permissions = {
  roles: ["user"],
  plan: "free",
  subscription_status: null,
  cancel_at_period_end: false,
};

const premiumUser: Permissions = {
  roles: ["user"],
  plan: "premium",
  subscription_status: "active",
  cancel_at_period_end: false,
};

const trialingUser: Permissions = {
  roles: ["user"],
  plan: "premium",
  subscription_status: "trialing",
  cancel_at_period_end: false,
};

const canceledUser: Permissions = {
  roles: ["user"],
  plan: "premium",
  subscription_status: "canceled",
  cancel_at_period_end: false,
};

const moderator: Permissions = {
  roles: ["user", "moderator"],
  plan: "premium",
  subscription_status: "active",
  cancel_at_period_end: false,
};

const admin: Permissions = {
  roles: ["user", "admin"],
  plan: "premium",
  subscription_status: "active",
  cancel_at_period_end: false,
};

describe("permissions", () => {
  describe("EMPTY_PERMISSIONS", () => {
    it("has correct defaults", () => {
      expect(EMPTY_PERMISSIONS.roles).toEqual(["user"]);
      expect(EMPTY_PERMISSIONS.plan).toBe("free");
      expect(EMPTY_PERMISSIONS.subscription_status).toBeNull();
      expect(EMPTY_PERMISSIONS.cancel_at_period_end).toBe(false);
    });
  });

  describe("hasRole", () => {
    it("returns true when user has the role", () => {
      expect(hasRole(admin, "admin")).toBe(true);
      expect(hasRole(moderator, "moderator")).toBe(true);
    });

    it("returns false when user lacks the role", () => {
      expect(hasRole(freeUser, "admin")).toBe(false);
      expect(hasRole(freeUser, "moderator")).toBe(false);
    });

    it("returns false for null/undefined permissions", () => {
      expect(hasRole(null, "admin")).toBe(false);
      expect(hasRole(undefined, "admin")).toBe(false);
    });
  });

  describe("isAdmin", () => {
    it("returns true for admin", () => {
      expect(isAdmin(admin)).toBe(true);
    });

    it("returns false for moderator", () => {
      expect(isAdmin(moderator)).toBe(false);
    });

    it("returns false for free user", () => {
      expect(isAdmin(freeUser)).toBe(false);
    });
  });

  describe("isModerator", () => {
    it("returns true for moderator", () => {
      expect(isModerator(moderator)).toBe(true);
    });

    it("returns true for admin (admin inherits moderator)", () => {
      expect(isModerator(admin)).toBe(true);
    });

    it("returns false for free user", () => {
      expect(isModerator(freeUser)).toBe(false);
    });
  });

  describe("isPremium", () => {
    it("returns true for active subscription", () => {
      expect(isPremium(premiumUser)).toBe(true);
    });

    it("returns true for trialing subscription", () => {
      expect(isPremium(trialingUser)).toBe(true);
    });

    it("returns false for canceled subscription", () => {
      expect(isPremium(canceledUser)).toBe(false);
    });

    it("returns false for free plan", () => {
      expect(isPremium(freeUser)).toBe(false);
    });

    it("returns false for null/undefined permissions", () => {
      expect(isPremium(null)).toBe(false);
      expect(isPremium(undefined)).toBe(false);
    });
  });

  describe("can (feature flags)", () => {
    it("premium features require active subscription", () => {
      expect(can("playback.4k", premiumUser)).toBe(true);
      expect(can("playback.4k", freeUser)).toBe(false);
      expect(can("playback.4k", canceledUser)).toBe(false);
    });

    it("admin.panel uses isModerator — true for moderator and admin", () => {
      expect(can("admin.panel", admin)).toBe(true);
      expect(can("admin.panel", moderator)).toBe(true);
      expect(can("admin.panel", freeUser)).toBe(false);
    });

    it("admin.manage-users uses isAdmin — only admin", () => {
      expect(can("admin.manage-users", admin)).toBe(true);
      expect(can("admin.manage-users", moderator)).toBe(false);
      expect(can("admin.manage-users", freeUser)).toBe(false);
    });

    it("moderator features require moderator or admin role", () => {
      expect(can("admin.moderation", moderator)).toBe(true);
      expect(can("admin.moderation", admin)).toBe(true);
      expect(can("admin.moderation", freeUser)).toBe(false);
    });

    it("returns false for null/undefined permissions", () => {
      expect(can("playback.4k", null)).toBe(false);
      expect(can("admin.panel", undefined)).toBe(false);
    });
  });
});
