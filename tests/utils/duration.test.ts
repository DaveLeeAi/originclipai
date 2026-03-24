import { describe, it, expect } from "vitest";
import { formatDuration, formatDurationHuman } from "@/lib/utils/duration";

describe("formatDuration", () => {
  it("formats seconds only", () => {
    expect(formatDuration(42)).toBe("00:42");
  });

  it("formats minutes and seconds", () => {
    expect(formatDuration(125)).toBe("02:05");
  });

  it("formats hours, minutes, seconds", () => {
    expect(formatDuration(3661)).toBe("01:01:01");
  });

  it("formats zero", () => {
    expect(formatDuration(0)).toBe("00:00");
  });

  it("handles exact minute boundaries", () => {
    expect(formatDuration(60)).toBe("01:00");
    expect(formatDuration(3600)).toBe("01:00:00");
  });
});

describe("formatDurationHuman", () => {
  it("formats seconds only", () => {
    expect(formatDurationHuman(42)).toBe("42s");
  });

  it("formats minutes and seconds", () => {
    expect(formatDurationHuman(125)).toBe("2m 5s");
  });

  it("formats even minutes", () => {
    expect(formatDurationHuman(120)).toBe("2m");
  });

  it("formats zero", () => {
    expect(formatDurationHuman(0)).toBe("0s");
  });
});
