import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "./useAuth";

const auth = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock("../lib/supabase", () => ({
  supabase: { auth },
}));

vi.mock("../lib/auth", () => ({
  authRedirectUrl: (kind: string) => `com.babyflow.app://auth/${kind}`,
}));

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.signInWithPassword.mockResolvedValue({ error: null });
    auth.signUp.mockResolvedValue({ data: { session: null }, error: null });
    auth.resetPasswordForEmail.mockResolvedValue({ error: null });
    auth.updateUser.mockResolvedValue({ error: null });
  });

  it("signs in with a password", async () => {
    const { result } = renderHook(() => useAuth(false));

    await act(async () => result.current.signIn("parent@example.com", "secret12"));

    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: "parent@example.com",
      password: "secret12",
    });
  });

  it("signs up with a confirmation callback", async () => {
    const { result } = renderHook(() => useAuth(false));
    let confirmationRequired = false;

    await act(async () => {
      confirmationRequired = await result.current.signUp("new@example.com", "secret12");
    });

    expect(auth.signUp).toHaveBeenCalledWith({
      email: "new@example.com",
      password: "secret12",
      options: { emailRedirectTo: "com.babyflow.app://auth/confirmation" },
    });
    expect(confirmationRequired).toBe(true);
  });

  it("requests password recovery with the reset callback", async () => {
    const { result } = renderHook(() => useAuth(false));

    await act(async () => result.current.requestPasswordReset("parent@example.com"));

    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith("parent@example.com", {
      redirectTo: "com.babyflow.app://auth/password-recovery",
    });
  });
});
