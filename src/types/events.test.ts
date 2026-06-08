import { describe, it, expect } from "vitest";
import { INVALID_SLEEP_SEQUENCE_PREFIX, parseInvalidSleepSequenceError } from "./events";

describe("parseInvalidSleepSequenceError", () => {
  it("extracts the event type from a prefixed message", () => {
    expect(parseInvalidSleepSequenceError(`${INVALID_SLEEP_SEQUENCE_PREFIX}sleep`)).toBe("sleep");
    expect(parseInvalidSleepSequenceError(`${INVALID_SLEEP_SEQUENCE_PREFIX}wake_up`)).toBe("wake_up");
  });

  it("returns null for messages without the prefix", () => {
    expect(parseInvalidSleepSequenceError("Unauthorized")).toBeNull();
  });

  it("returns null for a prefixed message with an unrecognized type", () => {
    expect(parseInvalidSleepSequenceError(`${INVALID_SLEEP_SEQUENCE_PREFIX}feeding`)).toBeNull();
  });
});
