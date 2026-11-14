// Mission clock: month (1–36) → stage → risk weight.
// This is what connects "time in space" with "which cause is most likely".

export const MISSION_MONTHS = 36;

export function getStage(month, stages) {
  const stage = stages.find((s) => month >= s.months[0] && month <= s.months[1]);
  if (!stage) throw new RangeError(`Month ${month} is outside the mission (1–${MISSION_MONTHS})`);
  return stage;
}

// Weight of one risk in one month (Low=1, Medium=2, High=3; our design model).
export function riskWeight(risk, month, stages, transitionMonths = []) {
  const stage = getStage(month, stages);
  let weight = risk.weights[stage.id] ?? 1;

  // "grows": +1 after the middle of the stage (e.g. bone loss late in the journey)
  if (risk.grows?.includes(stage.id)) {
    const middle = (stage.months[0] + stage.months[1]) / 2;
    if (month > middle) weight += 1;
  }

  // Right after a gravity change, balance problems are high again
  if (risk.transitionBoost && transitionMonths.includes(month)) weight = 3;

  return Math.min(weight, 3);
}
