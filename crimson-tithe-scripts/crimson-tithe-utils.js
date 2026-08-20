// crimson-tithe-utils.js
// getFlag is synchronous in Foundry - do not await Document#getFlag.

/**
 * Safely read a flag value (sync). Promise-compatible callers may still await this.
 * @param {Actor} actor
 * @param {string} scope
 * @param {string} key
 * @param {*} defaultValue
 * @returns {*}
 */
export function safeGetFlag(actor, scope, key, defaultValue) {
  if (!actor) {
    console.warn(`safeGetFlag: Invalid actor provided for key ${key}`);
    return defaultValue;
  }

  try {
    if (typeof actor.getFlag !== "function") {
      console.warn(`safeGetFlag: actor does not implement getFlag; returning default for key ${key}`);
      return defaultValue;
    }
    const flagValue = actor.getFlag(scope, key);
    return flagValue !== undefined && flagValue !== null ? flagValue : defaultValue;
  } catch (error) {
    console.error(`safeGetFlag: Error getting flag '${key}' on actor:`, error);
    return defaultValue;
  }
}

/** True when this client is the active GM (sole authority for multi-GM worlds). */
export function isActiveGM() {
  if (!game.user?.isGM) return false;
  const active = game.users?.activeGM;
  return !active || active.id === game.user.id;
}

export function forceRender(app) {
  if (!app?.render) return app;
  const after = () => {
    try {
      if (app.element || app.rendered) app.bringToFront?.();
    } catch (_err) {
      /* ignore pre-render bringToFront */
    }
  };
  let result;
  try {
    result = app.render({ force: true });
  } catch (_err) {
    try {
      result = app.render(true);
    } catch (_err2) {
      return app;
    }
  }
  if (result && typeof result.then === "function") result.then(after).catch(() => {});
  else after();
  return app;
}
