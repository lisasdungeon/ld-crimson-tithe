// crimson-tithe-scripts-eventTracker.js
import { crimsonTitheEvents } from "../crimson-tithe-config.js";
import { awardCrimsonPoints } from "./crimson-tithe-scripts-pointsManager.js";
import { playCrimsonTitheAudio } from "./crimson-tithe-scripts-audioPlayer.js";
import { postCrimsonTitheChatCard } from "./crimson-tithe-scripts-chatNotifier.js";
import { isActiveGM } from "./crimson-tithe-utils.js";

const MODULE_ID = "ld-crimson-tithe";

function resolveActorFromHookArgs(args) {
  if (args[0] instanceof Actor) return args[0];
  if (args[1] instanceof Actor) return args[1];
  if (args[0]?.parent instanceof Actor) return args[0].parent;
  if (args[0]?.actor instanceof Actor) return args[0].actor;
  if (args[0]?.token?.actor instanceof Actor) return args[0].token.actor;
  return null;
}

export function registerCrimsonTitheEventHooks() {
  for (const event of crimsonTitheEvents) {
    if (!event.hook || !event.condition || !event.cp) {
      console.warn("Crimson Tithe | Skipping invalid event configuration:", event);
      continue;
    }

    Hooks.on(event.hook, async (...args) => {
      // Only the active GM awards - prevents multi-GM double-credit.
      if (!isActiveGM()) return;

      const actor = resolveActorFromHookArgs(args);
      if (!actor?.hasPlayerOwner) return;

      try {
        if (event.condition(...args)) {
          await handleCrimsonTitheAward(actor, event);
        }
      } catch (e) {
        console.error(`Crimson Tithe | Error executing condition for hook ${event.hook}:`, e);
      }
    });
  }
  console.log(game.i18n?.localize?.("CT.logs.hooksRegistered") ?? "Crimson Tithe | Event hooks registered.");
}

async function handleCrimsonTitheAward(actor, event) {
  if (!actor || !event || !isActiveGM()) return;

  const pointsAwarded = event.cp;
  await awardCrimsonPoints(actor, pointsAwarded);

  const soundAndImageAmount = Math.max(1, Math.min(10, pointsAwarded));
  playCrimsonTitheAudio(soundAndImageAmount);
  postCrimsonTitheChatCard(actor, pointsAwarded, event.description);

  const socket = game[MODULE_ID]?.Tithe?.socket?.();
  if (socket) {
    socket.executeForEveryone("showAwardPopup", actor.id, soundAndImageAmount, event.description);
  } else {
    try {
      const { showCrimsonTithePopUp } = await import(
        "./crimson-tithe-scripts-ui/crimson-tithe-scripts-ui-popUpUI.js"
      );
      // Local fallback for solo GM testing
      if (!game.user.isGM) showCrimsonTithePopUp(actor, soundAndImageAmount, event.description);
    } catch (e) {
      console.error(game.i18n?.localize?.("CT.logs.popupFallback") ?? "Popup fallback failed", e);
    }
  }
}

export function initCrimsonTitheTracker() {
  if (isActiveGM()) registerCrimsonTitheEventHooks();
}
