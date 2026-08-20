// crimson-tithe-scripts-ui-playerHub.js
import { getCrimsonPoints } from "../crimson-tithe-scripts-pointsManager.js";
import { forceRender } from "../crimson-tithe-utils.js";

const MODULE_ID = "ld-crimson-tithe";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class CrimsonTithePlayerHub extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
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
    id: "crimson-tithe-player-hub",
    tag: "form",
    classes: ["ld-crimson-tithe", "ct-player-hub"],
    window: {
      icon: "fas fa-coins",
      title: "CT.playerHub.title",
      resizable: false,
      minimizable: true
    },
    position: {
      width: 320,
      height: "auto"
    }
  };

  static PARTS = {
    form: { template: `modules/${MODULE_ID}/crimson-tithe-templates/playerHub.html` }
  };

  async _prepareContext(_options) {
    const cp = getCrimsonPoints(this.actor);
    return {
      actorName: this.actor.name,
      actorImg: this.actor.img ?? "icons/svg/mystery-man.svg",
      cp,
      cpLabel: game.i18n.localize("CT.playerHub.cpLabel"),
      hint: game.i18n.localize("CT.playerHub.hint"),
      closeTitle: game.i18n.localize("CT.common.closeButtonTitle")
    };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);

    this._domAbort?.abort();
    this._domAbort = new AbortController();
    const { signal } = this._domAbort;

    this.element?.querySelector(".close")?.addEventListener("click", () => this.close(), { signal });
    this._registerHook();
    this.bringToFront?.();
  }

  _registerHook() {
    if (this._hookId) return;
    this._hookId = Hooks.on("updateActor", (actor) => {
      if (actor.id === this.actor?.id) this._debouncedRender();
    });
  }

  _unregisterHook() {
    if (this._hookId) {
      Hooks.off("updateActor", this._hookId);
      this._hookId = null;
    }
  }

  async close(options = {}) {
    this._domAbort?.abort();
    this._domAbort = null;
    this._unregisterHook();
    return super.close(options);
  }
}

export function openCrimsonTithePlayerHub(actor) {
  if (!actor) return null;
  const appId = `crimson-tithe-player-hub-${actor.id}`;

  try {
    const instances = foundry?.applications?.instances;
    if (instances?.get) {
      const existing = instances.get(appId);
      if (existing) return forceRender(existing);
    }
    if (instances?.values) {
      for (const app of instances.values()) {
        if (app instanceof CrimsonTithePlayerHub && app.actor?.id === actor.id) {
          return forceRender(app);
        }
      }
    }
  } catch (_err) {
    /* ignore */
  }

  const legacy = Object.values(ui.windows || {}).find((app) => app.id === appId);
  if (legacy) return forceRender(legacy);

  const app = new CrimsonTithePlayerHub(actor, { id: appId });
  return forceRender(app);
}
