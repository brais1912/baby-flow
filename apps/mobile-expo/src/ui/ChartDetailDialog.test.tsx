import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Text } from "react-native";
import { describe, expect, it, vi } from "vitest";
import { ChartDetailDialog } from "./ChartDetailDialog";

describe("ChartDetailDialog", () => {
  it("dismisses from the backdrop but not from the dialog content", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <ChartDetailDialog visible title="23 Aug" onClose={onClose}>
        <Text>2h 15 min</Text>
      </ChartDetailDialog>
    );

    await user.click(screen.getByTestId("chart-detail-dialog"));
    expect(onClose).not.toHaveBeenCalled();

    await user.click(screen.getByTestId("chart-detail-backdrop"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("has an explicit close control", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <ChartDetailDialog visible title="Sleep" onClose={onClose}>
        <Text>1h</Text>
      </ChartDetailDialog>
    );

    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
