import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SettingsScreen } from "./SettingsScreen";

function renderSettings(onSaveDayWindow: (startMinutes: number) => Promise<void>) {
  return render(
    <SettingsScreen
      dayWindowStartMinutes={12 * 60}
      email="parent@example.com"
      profile={{ name: "Luna", dateOfBirth: "2026-02-24" }}
      savingProfile={false}
      profileError={false}
      onSaveDayWindow={onSaveDayWindow}
      onSaveProfile={vi.fn().mockResolvedValue(undefined)}
      onSignOut={vi.fn().mockResolvedValue(undefined)}
    />
  );
}

describe("SettingsScreen owner-day start", () => {
  it("explains the shared boundary and saves a web-compatible preset", async () => {
    const user = userEvent.setup();
    const onSaveDayWindow = vi.fn().mockResolvedValue(undefined);
    renderSettings(onSaveDayWindow);

    expect(screen.getByText(/shared with the web app/i)).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "10:00" }));
    expect(screen.getByText(/A 10:00 start runs until 10:00/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save owner-day start" }));

    expect(onSaveDayWindow).toHaveBeenCalledWith(10 * 60);
    await waitFor(() => expect(screen.getByText("Owner-day start updated.")).toBeInTheDocument());
  });

  it("surfaces a persistence failure without changing the selected preset", async () => {
    const user = userEvent.setup();
    renderSettings(vi.fn().mockRejectedValue(new Error("write failed")));

    await user.click(screen.getByRole("radio", { name: "10:00" }));
    await user.click(screen.getByRole("button", { name: "Save owner-day start" }));

    await waitFor(() => expect(screen.getByText("Could not update the owner-day start.")).toBeInTheDocument());
    expect(screen.getByText(/A 10:00 start runs until 10:00/)).toBeInTheDocument();
  });
});
