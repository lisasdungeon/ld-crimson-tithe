// crimson-tithe-scripts-ui-gmHub.js
import { getCrimsonPoints, setCrimsonPoints } from "../crimson-tithe-scripts-pointsManager.js";
import { playCrimsonTitheAudio } from "../crimson-tithe-scripts-audioPlayer.js";
import { showCrimsonTithePopUp } from "./crimson-tithe-scripts-ui-popUpUI.js";
import { postCrimsonTitheChatCard } from "../crimson-tithe-scripts-chatNotifier.js";
import { forceRender } from "../crimson-tithe-utils.js";

const MODULE_ID = "ld-crimson-tithe";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class CrimsonTitheGMHub extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(options = {}) {
    super(options);
    this._hookId = null;
    this._domAbort = null;
    this._debouncedRender = foundry.utils.debounce(() => {
      try {
        this.render({ force: false });
      } catch (_err) {
        this.render(false);
      }
    }, 100);
  }

  static DEFAULT_OPTIONS = {
    id: "crimson-tithe-gm-hub",
    tag: "form",
    classes: ["ld-crimson-tithe", "ct-gm-hub"],
    window: {
      icon: "fas fa-coins",
      title: "CT.gmHub.title",
      resizable: true,
      minimizable: true
    },
    position: {
      width: 450,
      height: "auto"
    }
  };

  static PARTS = {
    form: { template: `modules/${MODULE_ID}/crimson-tithe-templates/gmHub.html` }
  };

  async _prepareContext(_options) {
    const allPlayerActors = game.actors.filter((a) => a.type === "character" && a.hasPlayerOwner);

    const actorData = allPlayerActors.map((actor) => ({
      id: actor.id,
      name: actor.name,
      points: getCrimsonPoints(actor)
    }));

    return { actors: actorData };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);

    this._domAbort?.abort();
    this._domAbort = new AbortController();
    const { signal } = this._domAbort;
    const root = this.element;
    if (!root) return;

    root.querySelector(".close")?.addEventListener("click", () => this.close(), { signal });

    root.querySelectorAll(".ct-btn").forEach((btn) => {
      btn.addEventListener("click", (ev) => this.handleButtonClick(ev), { signal });
    });

    this._registerHook();
    this.bringToFront?.();
  }

  async handleButtonClick(event) {
    const btn = event.currentTarget;
    const card = btn.closest(".ct-actor-card");
    const actorId = card?.dataset?.actorId;
    const action = btn.dataset.action;
    const input = card?.querySelector(".ct-amount-input");
    const amount = parseInt(input?.value, 10);

    if (!actorId) return;
    const actor = game.actors.get(actorId);
    if (!actor) return;

    if (Number.isNaN(amount) || amount < 1) {
      return ui.notifications.warn(game.i18n.localize("CT.gmHub.notifications.invalidAmount"));
    }

    await this.adjustPoints(actor, amount, action === "add");
  }

  async adjustPoints(actor, amount, isAdd) {
    const currentPoints = getCrimsonPoints(actor);
    let newPoints = isAdd ? currentPoints + amount : Math.max(0, currentPoints - amount);
    newPoints = Math.min(100, newPoints);

    await setCrimsonPoints(actor, newPoints);

    const notificationKey = isAdd
      ? "CT.gmHub.notifications.pointsAdded"
      : "CT.gmHub.notifications.pointsRemoved";
    ui.notifications.info(game.i18n.format(notificationKey, { amount, newPoints }));

    if (isAdd && amount > 0) {
      const description =
        game.i18n.localize("CT.events.manualGM") || "Points manually adjusted by GM.";
      const soundAmount = Math.max(1, Math.min(10, amount));

      playCrimsonTitheAudio(soundAmount);
      postCrimsonTitheChatCard(actor, amount, description);

      const socket = game[MODULE_ID]?.Tithe?.socket?.();
      if (socket) {
        socket.executeForEveryone("showAwardPopup", actor.id, soundAmount, description);
      } else {
        showCrimsonTithePopUp(actor, soundAmount, description);
      }
    }

    try {
      this.render({ force: true });
    } catch (_err) {
      this.render(true);
    }
  }

  _registerHook() {
    if (this._hookId) return;
    this._hookId = Hooks.on("updateActor", (actor, changes) => {
      if (actor?.type !== "character" || !actor.hasPlayerOwner) return;
      if (!foundry.utils.hasProperty(changes, `flags.${MODULE_ID}.liveCP`)) return;
      this._debouncedRender();
    });
  }

  _unregisterHook() {
    if (this._hookId) {
      Hooks.off("updateActor", this._hookId);
      this._hookId = null;
    }
  }

  async close(options) {
    this._domAbort?.abort();
    this._domAbort = null;
    this._unregisterHook();
    return super.close(options);
  }
}

export function openCrimsonTitheGMHub() {
  if (!game.user?.isGM) {
    ui.notifications.warn(game.i18n.localize("CT.api.gmOnlyWarning") || "GM only.");
    return null;
  }

  try {
    const existing = foundry?.applications?.instances?.get?.("crimson-tithe-gm-hub");
    if (existing) return forceRender(existing);
  } catch (_err) {
    /* ignore */
  }

  const legacy = Object.values(ui.windows || {}).find((app) => app.id === "crimson-tithe-gm-hub");
  if (legacy) return forceRender(legacy);

  const app = new CrimsonTitheGMHub();
  return forceRender(app);
}
