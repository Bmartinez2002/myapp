// Stability Index = 40% Capital + 35% Discipline + 25% AntiFuga
// EMA alpha 0.3 on the final score.
export type StabilityInput = {
  savingsRateMonth: number;       // 0..1
  metaVelocityRatio: number;      // 0..2 (>=1 means on track or ahead)
  debtToIncome: number;           // 0..1
  emergencyBufferMonths: number;  // 0..n
  habitHitRate14d: number;        // 0..1
  captureRegularity: number;      // 0..1
  streakDepthScore: number;       // 0..1
  weeklyReviewCompleted: number;  // 0..1
  impulseShareMonth: number;      // 0..1
  dangerCategoryShare: number;    // 0..1
  recentRelapseFactor: number;    // 0..1 (1 = very recent)
  dailyLimitOvershoot: number;    // 0..1 (share of days over)
  prevStability?: number;         // 0..100
};

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

export function pillarCapital(i: StabilityInput) {
  return clamp(
    40 * Math.max(0, i.savingsRateMonth) +
    30 * Math.min(1, Math.max(0, i.metaVelocityRatio)) +
    20 * (1 - Math.min(1, Math.max(0, i.debtToIncome))) +
    10 * Math.min(1, i.emergencyBufferMonths / 3)
  );
}
export function pillarDiscipline(i: StabilityInput) {
  return clamp(
    40 * i.habitHitRate14d +
    30 * i.captureRegularity +
    20 * i.streakDepthScore +
    10 * i.weeklyReviewCompleted
  );
}
export function pillarAntifuga(i: StabilityInput) {
  return clamp(
    100
    - 30 * i.impulseShareMonth
    - 30 * i.dangerCategoryShare
    - 20 * i.recentRelapseFactor
    - 20 * i.dailyLimitOvershoot
  );
}
export function stability(i: StabilityInput) {
  const cap = pillarCapital(i);
  const dis = pillarDiscipline(i);
  const af  = pillarAntifuga(i);
  const raw = 0.40*cap + 0.35*dis + 0.25*af;
  const alpha = 0.3;
  const smoothed = i.prevStability == null ? raw : alpha*raw + (1-alpha)*i.prevStability;
  return {
    score: Math.round(clamp(smoothed)),
    pillars: { capital: Math.round(cap), discipline: Math.round(dis), antifuga: Math.round(af) },
  };
}
