import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsScreen } from "./SettingsScreen";

describe("SettingsScreen", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 7, 22, 12));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the selected language, calculated age, and saves profile edits", async () => {
    const user = userEvent.setup();
    const onSaveProfile = vi.fn().mockResolvedValue(undefined);
    render(
      <SettingsScreen
        email="parent@example.com"
        profile={{ name: "Leo", dateOfBirth: "2026-05-22" }}
        savingProfile={false}
        profileError={false}
        onSaveProfile={onSaveProfile}
        onSignOut={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "English" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("3 months")).toBeInTheDocument();
    const name = screen.getByLabelText("Baby's name");
    await user.clear(name);
    await user.type(name, "Lía");
    await user.click(screen.getByRole("button", { name: "Update profile" }));
    expect(onSaveProfile).toHaveBeenCalledWith({ name: "Lía", dateOfBirth: "2026-05-22" });
  });
});
