import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProfileOnboarding } from "./ProfileOnboarding";

function renderOnboarding(overrides: Partial<React.ComponentProps<typeof ProfileOnboarding>> = {}) {
  const props: React.ComponentProps<typeof ProfileOnboarding> = {
    saving: false,
    error: false,
    onSave: vi.fn().mockResolvedValue(undefined),
    onSignOut: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  render(<ProfileOnboarding {...props} />);
  return props;
}

describe("ProfileOnboarding", () => {
  it("blocks access until required profile fields are valid", async () => {
    const user = userEvent.setup();
    const props = renderOnboarding();
    await user.click(screen.getByRole("button", { name: "Save profile" }));
    expect(screen.getByText("Enter your baby's name.")).toBeInTheDocument();
    expect(screen.getByText("Enter a date of birth.")).toBeInTheDocument();
    expect(props.onSave).not.toHaveBeenCalled();
  });

  it("rejects a future date with a localized inline error", async () => {
    const user = userEvent.setup();
    const props = renderOnboarding();
    await user.type(screen.getByLabelText("Baby's name"), "Leo");
    await user.type(screen.getByLabelText("Date of birth"), "2999-01-01");
    await user.click(screen.getByRole("button", { name: "Save profile" }));
    expect(screen.getByText("Date of birth cannot be in the future.")).toBeInTheDocument();
    expect(props.onSave).not.toHaveBeenCalled();
  });

  it("saves a trimmed valid profile and can transition without restart", async () => {
    const user = userEvent.setup();
    const props = renderOnboarding();
    await user.type(screen.getByLabelText("Baby's name"), "  Leo  ");
    await user.type(screen.getByLabelText("Date of birth"), "2026-05-22");
    await user.click(screen.getByRole("button", { name: "Save profile" }));
    expect(props.onSave).toHaveBeenCalledWith({ name: "Leo", dateOfBirth: "2026-05-22" });
  });

  it("surfaces retryable save errors and keeps sign out available", async () => {
    const user = userEvent.setup();
    const onSignOut = vi.fn().mockResolvedValue(undefined);
    renderOnboarding({ error: true, onSignOut });
    expect(screen.getByRole("alert")).toHaveTextContent("Could not save the baby profile");
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    expect(onSignOut).toHaveBeenCalledOnce();
  });
});
