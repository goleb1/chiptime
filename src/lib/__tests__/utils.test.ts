import {
  secondsToTimeString,
  timeStringToSeconds,
  formatErrorPercentage,
  getDefaultTimeForDistance,
} from "../utils";

describe("secondsToTimeString", () => {
  it("converts hours:minutes:seconds", () => {
    expect(secondsToTimeString(12240)).toBe("3:24:00");
  });

  it("converts minutes:seconds when under an hour", () => {
    expect(secondsToTimeString(1335)).toBe("22:15");
  });

  it("converts small times", () => {
    expect(secondsToTimeString(360)).toBe("6:00");
  });

  it("handles zero", () => {
    expect(secondsToTimeString(0)).toBe("0:00");
  });

  it("pads minutes when hours present", () => {
    expect(secondsToTimeString(3661)).toBe("1:01:01");
  });

  it("handles exactly one hour", () => {
    expect(secondsToTimeString(3600)).toBe("1:00:00");
  });
});

describe("timeStringToSeconds", () => {
  it("converts H:MM:SS format", () => {
    expect(timeStringToSeconds("3:24:00")).toBe(12240);
  });

  it("converts MM:SS format", () => {
    expect(timeStringToSeconds("22:15")).toBe(1335);
  });

  it("converts M:SS format", () => {
    expect(timeStringToSeconds("6:00")).toBe(360);
  });

  it("round-trips with secondsToTimeString", () => {
    const values = [0, 59, 60, 3599, 3600, 12240, 86400];
    for (const v of values) {
      expect(timeStringToSeconds(secondsToTimeString(v))).toBe(v);
    }
  });

  it("throws on invalid format", () => {
    expect(() => timeStringToSeconds("123")).toThrow();
  });
});

describe("formatErrorPercentage", () => {
  it("formats to 2 decimal places with % sign", () => {
    expect(formatErrorPercentage(2.8571)).toBe("2.86%");
  });

  it("formats zero", () => {
    expect(formatErrorPercentage(0)).toBe("0.00%");
  });

  it("formats whole number", () => {
    expect(formatErrorPercentage(5)).toBe("5.00%");
  });
});

describe("getDefaultTimeForDistance", () => {
  it("returns default for Full Marathon", () => {
    expect(getDefaultTimeForDistance("Full Marathon")).toBe(12600);
  });

  it("returns default for 5K", () => {
    expect(getDefaultTimeForDistance("5K")).toBe(1500);
  });

  it("returns 0 for unknown distance", () => {
    expect(getDefaultTimeForDistance("Unknown")).toBe(0);
  });
});
