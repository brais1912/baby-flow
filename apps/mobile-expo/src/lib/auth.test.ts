import { beforeEach, describe, expect, it, vi } from "vitest";
import { authRedirectUrl, completeAuthFromUrl } from "./auth";

const auth = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  setSession: vi.fn(),
}));

vi.mock("./supabase", () => ({ supabase: { auth } }));
vi.mock("expo-linking", () => ({
  addEventListener: vi.fn(),
  getInitialURL: vi.fn(),
}));

describe("native auth links", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.exchangeCodeForSession.mockResolvedValue({ error: null });
    auth.setSession.mockResolvedValue({ error: null });
  });

  it("exchanges a PKCE reset code and identifies password recovery", async () => {
    const kind = await completeAuthFromUrl("com.babyflow.app://auth/reset-callback?code=reset-code");
    expect(kind).toBe("password-recovery");
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith("reset-code");
  });

  it("restores a confirmation session from fragment tokens", async () => {
    const kind = await completeAuthFromUrl(
      "com.babyflow.app://auth/callback#access_token=access&refresh_token=refresh"
    );
    expect(kind).toBe("confirmation");
    expect(auth.setSession).toHaveBeenCalledWith({
      access_token: "access",
      refresh_token: "refresh",
    });
  });

  it("uses the configured app scheme for auth redirects", () => {
    expect(authRedirectUrl("confirmation")).toBe("com.babyflow.app://auth/callback");
    expect(authRedirectUrl("password-recovery")).toBe("com.babyflow.app://auth/reset-callback");
  });
});
