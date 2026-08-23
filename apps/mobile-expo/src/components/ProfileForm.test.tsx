import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProfileForm } from "./ProfileForm";

describe("ProfileForm", () => {
  it("requires both profile fields before saving", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<ProfileForm initialProfile={null} pending={false} saveError={false} onSave={onSave} submitLabel="Save profile" />);
    await user.click(screen.getByRole("button", { name: "Save profile" }));
    expect(screen.getByText("Enter your baby's name.")).toBeInTheDocument();
    expect(screen.getByText("Enter a date of birth.")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("trims a valid existing profile before saving", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<ProfileForm initialProfile={{ name: "Leo", dateOfBirth: "2026-05-22" }} pending={false} saveError={false} onSave={onSave} submitLabel="Update profile" />);
    const input = screen.getByLabelText("Baby's name");
    await user.clear(input);
    await user.type(input, "  Luna  ");
    await user.click(screen.getByRole("button", { name: "Update profile" }));
    expect(onSave).toHaveBeenCalledWith({ name: "Luna", dateOfBirth: "2026-05-22" });
  });
});
