// crimson-tithe-service-entry.js - sole entry point for ld-crimson-tithe
import "./scripts/rnk-localize-helper.js";
import { migrateLegacyFlags } from "./ld-legacy-migrate.js";

const MODULE_ID = "ld-crimson-tithe";
const TOOL_ID = "crimson-tithe-hub";
const SOCKET_CHANNEL = `module.${MODULE_ID}`;
const SOCKET_SCOPE = `${MODULE_ID}.crimsonTithe`;

const t = (key, fallback) => {
  const value = game.i18n?.localize?.(key);
  return value && value !== key ? value : fallback;
};

function isActiveGM() {
  if (!game.user?.isGM) return false;
  const active = game.users?.activeGM;
  return !active || active.id === game.user.id;
}

function forceRender(app) {
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

function createHubTool() {
  return {
    name: TOOL_ID,
    title: game.user?.isGM
      ? t("CT.sceneControls.gmTitle", "Crimson Tithe (GM)")
      : t("CT.sceneControls.playerTitle", "Crimson Tithe"),
    icon: "fas fa-coins",
    button: true,
    toggle: false,
    visible: true,
    order: 104,
    onChange: (active) => {
      if (active) openHubForUser();
    }
  };
}

async function openHubForUser() {
  if (game.user?.isGM) {
    const { openCrimsonTitheGMHub } = await import(
      "./crimson-tithe-scripts/crimson-tithe-scripts-ui/crimson-tithe-scripts-ui-gmHub.js"
    );
    openCrimsonTitheGMHub();
    return;
  }

  const actor = game.user?.character;
  if (!actor) {
    ui.notifications.warn(t("CT.warnings.noCharacterAssigned", "No character assigned."));
    return;
  }
  const { openCrimsonTithePlayerHub } = await import(
    "./crimson-tithe-scripts/crimson-tithe-scripts-ui/crimson-tithe-scripts-ui-playerHub.js"
  );
  openCrimsonTithePlayerHub(actor);
}

function injectToolIntoGroup(group, tool) {
  if (!group) return false;
  if (Array.isArray(group.tools)) {
    if (!group.tools.some((entry) => entry?.name === tool.name)) group.tools.push(tool);
    return true;
  }
  if (group.tools && typeof group.tools === "object") {
    if (!group.tools[tool.name]) group.tools[tool.name] = tool;
    return true;
  }
  group.tools = [tool];
  return true;
}

function ensureToolInControls(controls) {
  const tool = createHubTool();

  if (Array.isArray(controls)) {
    const token = controls.find((c) => c?.name === "token" || c?.name === "tokens");
    if (token && injectToolIntoGroup(token, tool)) return;

    if (!controls.some((c) => c?.name === MODULE_ID || c?.name === "crimson-tithe")) {
      controls.push({
        name: MODULE_ID,
        title: t("CT.sceneControls.gmTitle", "Crimson Tithe"),
        icon: "fas fa-coins",
        order: 104,
        layer: "token",
        visible: true,
        tools: [tool]
      });
    }
    return;
  }

  if (controls && typeof controls === "object") {
    const token = controls.token || controls.tokens;
    if (token && injectToolIntoGroup(token, tool)) return;

    controls[MODULE_ID] = {
      name: MODULE_ID,
      title: t("CT.sceneControls.gmTitle", "Crimson Tithe"),
      icon: "fas fa-coins",
      order: 104,
      layer: "token",
      visible: true,
      tools: { [tool.name]: tool }
    };
  }
}

function buildSocketBridge() {
  const foundrySocket = game?.socket;
  if (!foundrySocket?.on || !foundrySocket?.emit) return null;

  const listenerMap = new Map();

  const relay = (payload = {}) => {
    if (payload.__ctScope !== SOCKET_SCOPE) return;
    const callbacks = listenerMap.get(payload.event);
    if (!callbacks) return;
    for (const cb of callbacks) {
      try {
        cb(...(payload.args ?? []));
      } catch (e) {
        console.error("[ld-crimson-tithe] Socket listener error:", e);
      }
    }
  };

  if (!globalThis._rnkCrimsonTitheSocketBound) {
    globalThis._rnkCrimsonTitheSocketBound = true;
    foundrySocket.on(SOCKET_CHANNEL, relay);
  }

  return {
    register: (event, cb) => {
      if (!listenerMap.has(event)) listenerMap.set(event, new Set());
      listenerMap.get(event).add(cb);
    },
    executeForEveryone: (event, ...args) => {
      foundrySocket.emit(SOCKET_CHANNEL, { __ctScope: SOCKET_SCOPE, event, args });
    }
  };
}

// ── init ─────────────────────────────────────────────────────────────────────
Hooks.once("init", () => {
  console.log("[ld-crimson-tithe] init");

  Hooks.on("getSceneControlButtons", (controls) => {
    ensureToolInControls(controls);
  });

  Hooks.on("renderSceneControls", () => {
    const btn = document.querySelector(
      `[data-tool="${TOOL_ID}"], [data-control="${MODULE_ID}"], [data-control="crimson-tithe"]`
    );
    if (!btn) return;
    btn.style.setProperty("color", "#cc0000", "important");
    btn.style.setProperty("text-shadow", "0 0 8px rgba(180, 0, 0, 0.8)", "important");
  });
});

// ── setup - register hooks on every GM client; award path is active-GM-only ──
Hooks.once("setup", () => {
  if (!game.user?.isGM) return;
  import("./crimson-tithe-scripts/crimson-tithe-scripts-eventTracker.js")
    .then(({ registerCrimsonTitheEventHooks }) => registerCrimsonTitheEventHooks())
    .catch((err) => console.error("[ld-crimson-tithe] Failed to register event hooks:", err));
});

// ── ready - socket + public API ──────────────────────────────────────────────
Hooks.once("ready", () => {
  migrateLegacyFlags("ld-crimson-tithe", "rnk-crimson-tithe").catch(() => {});

  const socket = buildSocketBridge();

  if (socket) {
    socket.register("showAwardPopup", async (actorId, points, description) => {
      const actor = game.actors.get(actorId);
      // Owner clients only (skip GM to avoid double UI noise when awarding)
      if (!actor || !actor.isOwner || game.user.isGM) return;
      const { showCrimsonTithePopUp } = await import(
        "./crimson-tithe-scripts/crimson-tithe-scripts-ui/crimson-tithe-scripts-ui-popUpUI.js"
      );
      showCrimsonTithePopUp(actor, points, description);
    });
  }

  if (!game[MODULE_ID]) game[MODULE_ID] = {};

  game[MODULE_ID].Tithe = {
    socket: () => socket,
    isActiveGM,
    openGMHub: async () => {
      const { openCrimsonTitheGMHub } = await import(
        "./crimson-tithe-scripts/crimson-tithe-scripts-ui/crimson-tithe-scripts-ui-gmHub.js"
      );
      return openCrimsonTitheGMHub();
    },
    openPlayerHub: async (actor) => {
      const target = actor || game.user?.character;
      if (!target) {
        ui.notifications.warn(t("CT.warnings.noCharacterAssigned", "No character assigned."));
        return null;
      }
      const { openCrimsonTithePlayerHub } = await import(
        "./crimson-tithe-scripts/crimson-tithe-scripts-ui/crimson-tithe-scripts-ui-playerHub.js"
      );
      return openCrimsonTithePlayerHub(target);
    },
    awardPoints: async (actorId, points, description = "Points awarded via API.") => {
      if (!isActiveGM()) {
        return ui.notifications.warn(t("CT.api.gmOnlyWarning", "GM only."));
      }
      const actor = game.actors.get(actorId);
      if (!actor || !(points > 0)) {
        return ui.notifications.error(t("CT.api.invalidInputError", "Invalid award input."));
      }

      const { awardCrimsonPoints } = await import(
        "./crimson-tithe-scripts/crimson-tithe-scripts-pointsManager.js"
      );
      const { playCrimsonTitheAudio } = await import(
        "./crimson-tithe-scripts/crimson-tithe-scripts-audioPlayer.js"
      );
      const { postCrimsonTitheChatCard } = await import(
        "./crimson-tithe-scripts/crimson-tithe-scripts-chatNotifier.js"
      );

      await awardCrimsonPoints(actor, points);
      const capped = Math.max(1, Math.min(10, points));
      playCrimsonTitheAudio(capped);
      postCrimsonTitheChatCard(actor, points, description);

      socket?.executeForEveryone("showAwardPopup", actor.id, capped, description);
    }
  };

  console.log("[ld-crimson-tithe] ready");
});

export { forceRender, isActiveGM, MODULE_ID };
