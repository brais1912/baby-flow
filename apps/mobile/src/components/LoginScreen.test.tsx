import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LoginScreen } from "./LoginScreen";

function renderLogin() {
  const handlers = {
    onClearError: vi.fn(),
    onSignIn: vi.fn().mockResolvedValue(undefined),
    onSignUp: vi.fn().mockResolvedValue(true),
    onPasswordReset: vi.fn().mockResolvedValue(undefined),
  };

  render(<LoginScreen error={null} {...handlers} />);
  return handlers;
}

describe("LoginScreen", () => {
  it("signs in with email and password", async () => {
    const user = userEvent.setup();
    const handlers = renderLogin();

    await user.type(screen.getByLabelText("Email"), "parent@example.com");
    await user.type(screen.getByLabelText("Password"), "secret12");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(handlers.onSignIn).toHaveBeenCalledWith("parent@example.com", "secret12");
  });

  it("creates an account with email and password", async () => {
    const user = userEvent.setup();
    const handlers = renderLogin();

    await user.click(screen.getByRole("button", { name: "Create account" }));
    await user.type(screen.getByLabelText("Email"), "new@example.com");
    await user.type(screen.getByLabelText("Password"), "secret12");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(handlers.onSignUp).toHaveBeenCalledWith("new@example.com", "secret12");
    expect(await screen.findByRole("status")).toHaveTextContent("confirm your account");
  });

  it("requests a password reset", async () => {
    const user = userEvent.setup();
    const handlers = renderLogin();

    await user.click(screen.getByRole("button", { name: "Forgot password?" }));
    await user.type(screen.getByLabelText("Email"), "parent@example.com");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(handlers.onPasswordReset).toHaveBeenCalledWith("parent@example.com");
    expect(await screen.findByRole("status")).toHaveTextContent("password reset link");
  });
});
