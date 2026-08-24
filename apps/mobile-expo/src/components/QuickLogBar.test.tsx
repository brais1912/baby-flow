import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { QuickLogBar } from "./QuickLogBar";

describe("QuickLogBar", () => {
  it("creates the selected event immediately as QuickLog", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn().mockResolvedValue(undefined);
    render(<QuickLogBar disabled={false} onCreate={onCreate} onOpenDetailed={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Sleep" }));
    expect(onCreate).toHaveBeenCalledOnce();
    expect(onCreate.mock.calls[0]?.[0]).toMatchObject({ type: "sleep", notes: "QuickLog" });
    expect(onCreate.mock.calls[0]?.[0].occurredAt).toBeInstanceOf(Date);
    expect(screen.getByText("Saved")).toBeInTheDocument();
  });

  it("disables mutations while offline or pending", () => {
    render(<QuickLogBar disabled onCreate={vi.fn()} onOpenDetailed={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Sleep" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Diaper" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "New detailed event" })).toBeDisabled();
  });

  it("keeps detailed event creation beside the primary quick-log actions", async () => {
    const user = userEvent.setup();
    const onOpenDetailed = vi.fn();
    render(<QuickLogBar disabled={false} onCreate={vi.fn()} onOpenDetailed={onOpenDetailed} />);

    await user.click(screen.getByRole("button", { name: "New detailed event" }));

    expect(onOpenDetailed).toHaveBeenCalledOnce();
  });
});
