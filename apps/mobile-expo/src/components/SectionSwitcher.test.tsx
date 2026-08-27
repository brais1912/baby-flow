import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SectionSwitcher } from "./SectionSwitcher";

vi.mock("react-native-svg", async () => {
  const { View } = await import("react-native");
  return {
    default: View,
    Circle: View,
    Line: View,
    Path: View,
  };
});

describe("SectionSwitcher", () => {
  it("shows the current section and selects a destination from the sheet", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<SectionSwitcher activeTab="events" onSelect={onSelect} />);

    await user.click(screen.getByRole("button", { name: "Main navigation: Events" }));

    expect(screen.getAllByRole("tab")).toHaveLength(4);
    await user.click(screen.getByRole("tab", { name: "Insights" }));
    expect(onSelect).toHaveBeenCalledWith("insights");
  });
});
