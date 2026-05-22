import { describe, it, expect } from "vitest";
import { stability, pillarCapital, pillarDiscipline, pillarAntifuga, type StabilityInput } from "./stability";

const base: StabilityInput = {
  savingsRateMonth:     0.3,
  metaVelocityRatio:    0.5,
  debtToIncome:         0.2,
  emergencyBufferMonths:1,
  habitHitRate14d:      0.7,
  captureRegularity:    0.8,
  streakDepthScore:     0.5,
  weeklyReviewCompleted:0.5,
  impulseShareMonth:    0.1,
  dangerCategoryShare:  0.1,
  recentRelapseFactor:  0.2,
  dailyLimitOvershoot:  0.1,
};

// ── pillarCapital ────────────────────────────────────────────
describe("pillarCapital", () => {
  it("clamps at 100 with perfect inputs", () => {
    expect(pillarCapital({ ...base, savingsRateMonth:1, metaVelocityRatio:1, debtToIncome:0, emergencyBufferMonths:3 })).toBe(100);
  });
  it("clamps at 0 with worst inputs", () => {
    expect(pillarCapital({ ...base, savingsRateMonth:0, metaVelocityRatio:0, debtToIncome:1, emergencyBufferMonths:0 })).toBe(0);
  });
  it("weights savingsRate 40pts", () => {
    const v = pillarCapital({ ...base, savingsRateMonth:0.5, metaVelocityRatio:0, debtToIncome:1, emergencyBufferMonths:0 });
    expect(v).toBeCloseTo(20, 0);
  });
  it("weights metaVelocity 30pts max", () => {
    const v = pillarCapital({ ...base, savingsRateMonth:0, metaVelocityRatio:1, debtToIncome:1, emergencyBufferMonths:0 });
    expect(v).toBeCloseTo(30, 0);
  });
  it("caps metaVelocityRatio at 1", () => {
    const a = pillarCapital({ ...base, metaVelocityRatio: 1 });
    const b = pillarCapital({ ...base, metaVelocityRatio: 5 });
    expect(a).toBe(b);
  });
});

// ── pillarDiscipline ─────────────────────────────────────────
describe("pillarDiscipline", () => {
  it("returns 100 with perfect inputs", () => {
    expect(pillarDiscipline({ ...base, habitHitRate14d:1, captureRegularity:1, streakDepthScore:1, weeklyReviewCompleted:1 })).toBe(100);
  });
  it("returns 0 with zero inputs", () => {
    expect(pillarDiscipline({ ...base, habitHitRate14d:0, captureRegularity:0, streakDepthScore:0, weeklyReviewCompleted:0 })).toBe(0);
  });
  it("weights habitHitRate14d at 40pts", () => {
    const v = pillarDiscipline({ ...base, habitHitRate14d:1, captureRegularity:0, streakDepthScore:0, weeklyReviewCompleted:0 });
    expect(v).toBe(40);
  });
  it("weights captureRegularity at 30pts", () => {
    const v = pillarDiscipline({ ...base, habitHitRate14d:0, captureRegularity:1, streakDepthScore:0, weeklyReviewCompleted:0 });
    expect(v).toBe(30);
  });
});

// ── pillarAntifuga ───────────────────────────────────────────
describe("pillarAntifuga", () => {
  it("returns 100 with no fugas", () => {
    expect(pillarAntifuga({ ...base, impulseShareMonth:0, dangerCategoryShare:0, recentRelapseFactor:0, dailyLimitOvershoot:0 })).toBe(100);
  });
  it("clamps at 0 with all maxed", () => {
    expect(pillarAntifuga({ ...base, impulseShareMonth:1, dangerCategoryShare:1, recentRelapseFactor:1, dailyLimitOvershoot:1 })).toBe(0);
  });
  it("penalizes impulse 30pts", () => {
    const v = pillarAntifuga({ ...base, impulseShareMonth:1, dangerCategoryShare:0, recentRelapseFactor:0, dailyLimitOvershoot:0 });
    expect(v).toBe(70);
  });
  it("penalizes dangerCategory 30pts", () => {
    const v = pillarAntifuga({ ...base, impulseShareMonth:0, dangerCategoryShare:1, recentRelapseFactor:0, dailyLimitOvershoot:0 });
    expect(v).toBe(70);
  });
});

// ── stability composite ──────────────────────────────────────
describe("stability", () => {
  it("returns score in [0, 100]", () => {
    const { score } = stability(base);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
  it("returns integer score", () => {
    expect(Number.isInteger(stability(base).score)).toBe(true);
  });
  it("perfect inputs → score 100", () => {
    const perfect: StabilityInput = {
      savingsRateMonth:1, metaVelocityRatio:1, debtToIncome:0, emergencyBufferMonths:3,
      habitHitRate14d:1, captureRegularity:1, streakDepthScore:1, weeklyReviewCompleted:1,
      impulseShareMonth:0, dangerCategoryShare:0, recentRelapseFactor:0, dailyLimitOvershoot:0,
    };
    expect(stability(perfect).score).toBe(100);
  });
  it("worst inputs → score 0", () => {
    const worst: StabilityInput = {
      savingsRateMonth:0, metaVelocityRatio:0, debtToIncome:1, emergencyBufferMonths:0,
      habitHitRate14d:0, captureRegularity:0, streakDepthScore:0, weeklyReviewCompleted:0,
      impulseShareMonth:1, dangerCategoryShare:1, recentRelapseFactor:1, dailyLimitOvershoot:1,
    };
    expect(stability(worst).score).toBe(0);
  });
  it("EMA smooths toward prevStability", () => {
    const { score: raw } = stability(base);
    const { score: smoothed } = stability({ ...base, prevStability: 0 });
    expect(smoothed).toBeLessThan(raw);
  });
  it("no prevStability → raw score (no EMA)", () => {
    const { score: a } = stability(base);
    const { score: b } = stability({ ...base, prevStability: undefined });
    expect(a).toBe(b);
  });
  it("pillars sum correctly into score with formula 0.40/0.35/0.25", () => {
    const inp: StabilityInput = {
      savingsRateMonth:0, metaVelocityRatio:0, debtToIncome:0, emergencyBufferMonths:0,
      habitHitRate14d:1, captureRegularity:0, streakDepthScore:0, weeklyReviewCompleted:0,
      impulseShareMonth:0, dangerCategoryShare:0, recentRelapseFactor:0, dailyLimitOvershoot:0,
    };
    const { score, pillars } = stability(inp);
    const expected = Math.round(0.40 * pillars.capital + 0.35 * pillars.discipline + 0.25 * pillars.antifuga);
    expect(score).toBe(expected);
  });
  it("returns all three pillar values", () => {
    const { pillars } = stability(base);
    expect(pillars).toHaveProperty("capital");
    expect(pillars).toHaveProperty("discipline");
    expect(pillars).toHaveProperty("antifuga");
  });
  it("pillar values are integers", () => {
    const { pillars } = stability(base);
    expect(Number.isInteger(pillars.capital)).toBe(true);
    expect(Number.isInteger(pillars.discipline)).toBe(true);
    expect(Number.isInteger(pillars.antifuga)).toBe(true);
  });
  it("base input yields sensible score in 50–80 range", () => {
    const { score } = stability(base);
    expect(score).toBeGreaterThan(50);
    expect(score).toBeLessThan(85);
  });
  it("higher savingsRate increases score monotonically", () => {
    const low  = stability({ ...base, savingsRateMonth: 0.1 }).score;
    const high = stability({ ...base, savingsRateMonth: 0.8 }).score;
    expect(high).toBeGreaterThan(low);
  });
  it("higher impulseShare decreases score monotonically", () => {
    const low  = stability({ ...base, impulseShareMonth: 0.05 }).score;
    const high = stability({ ...base, impulseShareMonth: 0.6 }).score;
    expect(high).toBeLessThan(low);
  });
  it("debtToIncome=1 significantly lowers capital pillar", () => {
    const { pillars: a } = stability({ ...base, debtToIncome: 0 });
    const { pillars: b } = stability({ ...base, debtToIncome: 1 });
    expect(b.capital).toBeLessThan(a.capital);
  });
});
