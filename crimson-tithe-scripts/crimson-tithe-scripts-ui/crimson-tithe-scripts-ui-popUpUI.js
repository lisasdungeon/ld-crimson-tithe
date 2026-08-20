// crimson-tithe-scripts-ui-popUpUI.js
import { forceRender } from "../crimson-tithe-utils.js";

const MODULE_ID = "ld-crimson-tithe";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class CrimsonTithePopUp extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor({ phraseText, imagePath }, options = {}) {
    super(options);
    this.phraseText = phraseText;
    this.imagePath = imagePath;
    this._domAbort = null;
    this._autoCloseTimer = null;
  }

  static DEFAULT_OPTIONS = {
    id: "crimson-tithe-popup",
    tag: "form",
    classes: ["ld-crimson-tithe", "ct-popup"],
    window: {
      icon: "fas fa-coins",
      title: "CT.popUp.title",
      resizable: false,
      minimizable: false
    },
    position: {
      width: 400,
      height: "auto"
    }
  };

  static PARTS = {
    form: { template: `modules/${MODULE_ID}/crimson-tithe-templates/popUpUI.html` }
  };

  async _prepareContext(_options) {
    return {
      phraseText: this.phraseText,
      imagePath: this.imagePath
    };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);

    this._domAbort?.abort();
    this._domAbort = new AbortController();
    const { signal } = this._domAbort;

    this.element
      ?.querySelector(".crimson-tithe-popup-close")
      ?.addEventListener("click", () => this.close(), { signal });

    if (this._autoCloseTimer) clearTimeout(this._autoCloseTimer);
    this._autoCloseTimer = setTimeout(() => {
      this.close().catch(() => {});
    }, 5000);

    this.bringToFront?.();
  }

  async close(options = {}) {
    this._domAbort?.abort();
    this._domAbort = null;
    if (this._autoCloseTimer) {
      clearTimeout(this._autoCloseTimer);
      this._autoCloseTimer = null;
    }
    return super.close(options);
  }
}

export function showCrimsonTithePopUp(actor, cpPoints, phraseText) {
  const cappedPoints = Math.max(1, Math.min(10, Math.floor(cpPoints) || 1));
  const imagePath = `modules/${MODULE_ID}/crimson-tithe-assets/crimson-tithe-assets-pics/cp${cappedPoints}.png`;
  const appId = `crimson-tithe-popup-${actor?.id ?? "anon"}`;

  try {
    const existing = foundry?.applications?.instances?.get?.(appId);
    if (existing) return forceRender(existing);
  } catch (_err) {
    /* ignore */
  }

  if (Object.values(ui.windows || {}).some((app) => app.id === appId)) {
    return;
  }

  const popUp = new CrimsonTithePopUp(
    { phraseText: phraseText ?? "", imagePath },
    { id: appId }
  );
  return forceRender(popUp);
}
