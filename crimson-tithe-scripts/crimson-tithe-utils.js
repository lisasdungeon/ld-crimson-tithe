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
function isActiveFlagScope(scope) {
  if (!scope) return false;
  if (scope === globalThis.game?.system?.id) return true;
  return Boolean(globalThis.game?.modules?.get?.(scope)?.active);
}

function readFlagBag(actor, scope, key) {
  const bag = actor.flags?.[scope];
  if (bag == null) return undefined;
  if (globalThis.foundry?.utils?.getProperty) return foundry.utils.getProperty(bag, key);
  return key.split(".").reduce((acc, part) => (acc == null ? acc : acc[part]), bag);
}

export function safeGetFlag(actor, scope, key, defaultValue) {
  if (!actor) return defaultValue;

  if (isActiveFlagScope(scope) && typeof actor.getFlag === "function") {
    try {
      const flagValue = actor.getFlag(scope, key);
      return flagValue !== undefined && flagValue !== null ? flagValue : defaultValue;
    } catch (_err) {
      /* inactive or invalid scope; fall through to raw flags */
    }
  }

  const raw = readFlagBag(actor, scope, key);
  return raw !== undefined && raw !== null ? raw : defaultValue;
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
