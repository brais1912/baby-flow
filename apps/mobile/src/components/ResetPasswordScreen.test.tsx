import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ResetPasswordScreen } from "./ResetPasswordScreen";

describe("ResetPasswordScreen", () => {
  it("rejects mismatched passwords without updating the account", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ResetPasswordScreen error={null} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("New password"), "secret12");
    await user.type(screen.getByLabelText("Confirm password"), "different12");
    await user.click(screen.getByRole("button", { name: "Save new password" }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Passwords do not match");
  });

  it("updates the account when passwords match", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ResetPasswordScreen error={null} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("New password"), "secret12");
    await user.type(screen.getByLabelText("Confirm password"), "secret12");
    await user.click(screen.getByRole("button", { name: "Save new password" }));

    expect(onSubmit).toHaveBeenCalledWith("secret12");
  });
});
