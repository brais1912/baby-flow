import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

const state = vi.hoisted(() => ({
  signOut: vi.fn().mockResolvedValue(undefined),
  save: vi.fn().mockResolvedValue(undefined),
  reload: vi.fn().mockResolvedValue(undefined),
  profileError: false,
}));

vi.mock("./hooks/useAuth", () => ({
  useAuth: () => ({
    session: {
      access_token: "token",
      refresh_token: "refresh",
      expires_in: 3600,
      token_type: "bearer",
      user: { id: "user-1", email: "parent@example.com" },
    },
    loading: false,
    error: null,
    passwordRecovery: false,
    setError: vi.fn(),
    beginPasswordRecovery: vi.fn(),
    signIn: vi.fn(),
    signUp: vi.fn(),
    requestPasswordReset: vi.fn(),
    updatePassword: vi.fn(),
    signOut: state.signOut,
  }),
}));

vi.mock("./hooks/useProfile", () => ({
  useProfile: () => ({
    profile: null,
    loading: false,
    saving: false,
    loadError: state.profileError,
    saveError: false,
    save: state.save,
    reload: state.reload,
  }),
}));

vi.mock("./lib/supabase", () => ({ isSupabaseConfigured: true }));
vi.mock("./lib/auth", () => ({ initializeNativeAuthLinks: vi.fn().mockResolvedValue(() => undefined) }));

describe("App profile gate", () => {
  beforeEach(() => {
    state.profileError = false;
    vi.clearAllMocks();
  });

  it("shows mandatory onboarding instead of authenticated tabs when the profile is incomplete", async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByRole("heading", { name: "Tell us about your baby" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    expect(state.signOut).toHaveBeenCalledOnce();
  });

  it("surfaces a retry action when profile loading fails", async () => {
    const user = userEvent.setup();
    state.profileError = true;
    render(<App />);
    expect(screen.getByRole("alert")).toHaveTextContent("Could not load the baby profile");
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(state.reload).toHaveBeenCalledOnce();
  });
});
