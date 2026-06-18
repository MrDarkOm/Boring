import { describe, it, expect } from "vitest";
import { wmoToWeatherId, haversine, fmtDist } from "../index";

describe("wmoToWeatherId", () => {
  it("returns sun for codes 0 and 1", () => {
    expect(wmoToWeatherId(0)).toBe("sun");
    expect(wmoToWeatherId(1)).toBe("sun");
  });

  it("returns cloud for codes 2, 3, 45, 48", () => {
    expect(wmoToWeatherId(2)).toBe("cloud");
    expect(wmoToWeatherId(3)).toBe("cloud");
    expect(wmoToWeatherId(45)).toBe("cloud");
    expect(wmoToWeatherId(48)).toBe("cloud");
  });

  it("returns rain for drizzle/rain codes 51-67", () => {
    expect(wmoToWeatherId(51)).toBe("rain");
    expect(wmoToWeatherId(61)).toBe("rain");
    expect(wmoToWeatherId(67)).toBe("rain");
  });

  it("returns snow for codes 71-77", () => {
    expect(wmoToWeatherId(71)).toBe("snow");
    expect(wmoToWeatherId(77)).toBe("snow");
  });

  it("returns rain for showers 80-82", () => {
    expect(wmoToWeatherId(80)).toBe("rain");
    expect(wmoToWeatherId(82)).toBe("rain");
  });

  it("returns storm for codes 95, 96, 99", () => {
    expect(wmoToWeatherId(95)).toBe("storm");
    expect(wmoToWeatherId(96)).toBe("storm");
    expect(wmoToWeatherId(99)).toBe("storm");
  });

  it("defaults to cloud for unknown codes", () => {
    expect(wmoToWeatherId(100)).toBe("cloud");
    expect(wmoToWeatherId(42)).toBe("cloud");
  });
});

describe("haversine", () => {
  it("returns 0 for same point", () => {
    expect(haversine(55.75, 37.62, 55.75, 37.62)).toBe(0);
  });

  it("calculates distance between Moscow and Saint Petersburg (~635km)", () => {
    const dist = haversine(55.7558, 37.6176, 59.9343, 30.3351);
    expect(dist).toBeGreaterThan(630_000);
    expect(dist).toBeLessThan(640_000);
  });

  it("calculates short distance correctly (~111m per 0.001 degree)", () => {
    const dist = haversine(55.75, 37.62, 55.751, 37.62);
    expect(dist).toBeGreaterThan(100);
    expect(dist).toBeLessThan(120);
  });
});

describe("fmtDist", () => {
  it("formats metres for distance < 1000", () => {
    expect(fmtDist(500)).toBe("500м");
    expect(fmtDist(999)).toBe("999м");
  });

  it("formats kilometres for distance >= 1000", () => {
    expect(fmtDist(1000)).toBe("1.0км");
    expect(fmtDist(1500)).toBe("1.5км");
    expect(fmtDist(12345)).toBe("12.3км");
  });
});
