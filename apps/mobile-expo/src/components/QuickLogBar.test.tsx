import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { View as NativeView } from "react-native";
import { describe, expect, it, vi } from "vitest";
import type { EventInput } from "../types/events";
import { QuickLogBar } from "./QuickLogBar";

function renderQuickLog({
  compact = false,
  disabled = false,
  onCreate = vi.fn().mockResolvedValue(undefined),
  onOpenDetailed = vi.fn(),
}: {
  compact?: boolean;
  disabled?: boolean;
  onCreate?: (input: EventInput) => Promise<unknown>;
  onOpenDetailed?: () => void;
} = {}) {
  return render(
    <QuickLogBar
      blurTarget={createRef<NativeView>()}
      bottomInset={12}
      compact={compact}
      disabled={disabled}
      onCreate={onCreate}
      onOpenDetailed={onOpenDetailed}
    />
  );
}

describe("QuickLogBar", () => {
  it("creates the selected event immediately as QuickLog", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn().mockResolvedValue(undefined);
    renderQuickLog({ onCreate });
    await user.click(screen.getByRole("button", { name: "Sleep" }));
    expect(onCreate).toHaveBeenCalledOnce();
    expect(onCreate.mock.calls[0]?.[0]).toMatchObject({ type: "sleep", notes: "QuickLog" });
    expect(onCreate.mock.calls[0]?.[0].occurredAt).toBeInstanceOf(Date);
    expect(screen.getByText("Saved")).toBeInTheDocument();
  });

  it("disables mutations while offline or pending", () => {
    renderQuickLog({ disabled: true });
    expect(screen.getByRole("button", { name: "Sleep" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Diaper" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "New detailed event" })).toBeDisabled();
  });

  it("keeps detailed event creation beside the primary quick-log actions", async () => {
    const user = userEvent.setup();
    const onOpenDetailed = vi.fn();
    renderQuickLog({ onOpenDetailed });

    await user.click(screen.getByRole("button", { name: "New detailed event" }));

    expect(onOpenDetailed).toHaveBeenCalledOnce();
  });

  it("keeps every action available in its compact state", () => {
    renderQuickLog({ compact: true });

    expect(screen.getByRole("button", { name: "Sleep" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Wake" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Feed" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Diaper" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New detailed event" })).toBeInTheDocument();
  });
});
