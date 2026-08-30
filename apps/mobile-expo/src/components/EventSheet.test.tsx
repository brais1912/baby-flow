import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EventSheet } from "./EventSheet";

describe("EventSheet", () => {
  it("keeps the save action outside the scrolling form", () => {
    render(
      <EventSheet
        event={null}
        pending={false}
        error={null}
        onClose={vi.fn()}
        onCreate={vi.fn().mockResolvedValue(undefined)}
        onUpdateTime={vi.fn().mockResolvedValue(undefined)}
      />
    );

    const save = screen.getByRole("button", { name: "Save" });
    expect(screen.getByTestId("event-sheet-footer")).toContainElement(save);
    expect(screen.getByTestId("event-sheet-fields")).not.toContainElement(save);
  });
});
