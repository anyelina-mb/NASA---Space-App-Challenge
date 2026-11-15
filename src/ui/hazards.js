// NASA hazard of a risk → Learn's hazard filter
export const HAZARD_ID = { 'Gravity fields': 'gravity', 'Isolation and confinement': 'isolation', 'Distance from Earth': 'distance', 'Hostile, closed environment': 'environment', 'Space radiation': 'radiation' };
export const hazardOf = (risk) => HAZARD_ID[risk?.hazard] ?? (risk?.id === 'sleep' ? 'isolation' : null);
export const HAZARD_LABEL = { gravity: 'Gravity', isolation: 'Isolation', distance: 'Distance', environment: 'Closed habitat', radiation: 'Radiation' };

// Laika's line for a stage: "We landed!" only in the first two months on Mars, then a calmer line
export const laikaLine = (stage, month) => (stage.laikaLater && month > stage.months[0] + 1 ? stage.laikaLater : stage.laika);
