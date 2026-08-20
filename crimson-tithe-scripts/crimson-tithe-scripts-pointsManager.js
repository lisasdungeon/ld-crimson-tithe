// crimson-tithe-scripts-pointsManager.js
import { safeGetFlag } from "./crimson-tithe-utils.js";

const CP_FLAG_SCOPE = "ld-crimson-tithe";
const CP_FLAG_KEY = "liveCP";

export function getCrimsonPoints(actor) {
  const currentValue = safeGetFlag(actor, CP_FLAG_SCOPE, CP_FLAG_KEY, null);
  if (currentValue !== null && currentValue !== undefined) return Number(currentValue) || 0;

  const legacyValue = safeGetFlag(actor, "rnk-crimson-blood", CP_FLAG_KEY, 0);
  return Number(legacyValue) || 0;
}

export async function setCrimsonPoints(actor, value) {
  if (!actor) return;
  const newValue = Math.max(0, Number(value) || 0);
  await actor.setFlag(CP_FLAG_SCOPE, CP_FLAG_KEY, newValue);
}

export async function awardCrimsonPoints(actor, delta) {
  if (!actor || Number(delta) <= 0) return;
  const currentCP = getCrimsonPoints(actor);
  const newCP = Math.min(100, currentCP + Number(delta));
  await setCrimsonPoints(actor, newCP);
}

export async function removeCrimsonPoints(actor, delta) {
  if (!actor || Number(delta) <= 0) return;
  const currentCP = getCrimsonPoints(actor);
  const newCP = Math.max(0, currentCP - Math.abs(Number(delta)));
  await setCrimsonPoints(actor, newCP);
}
