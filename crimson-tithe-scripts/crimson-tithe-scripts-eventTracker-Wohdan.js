// crimson-tithe-scripts-eventTracker.js
import { crimsonTitheEvents } from "../crimson-tithe-config.js";
import { awardCrimsonPoints, awardTransformationPoints } from "./crimson-tithe-scripts-pointsManager.js";
import { playCrimsonTitheAudio } from "./crimson-tithe-scripts-audioPlayer.js";
import { postCrimsonTitheChatCard } from "./crimson-tithe-scripts-chatNotifier.js";

const MODULE_ID = 'ld-crimson-tithe';

export function registerCrimsonTitheEventHooks() {
  // Intercept texture loading to fix invalid beam-jet-red icon early
  Hooks.on("init", () => {
    if (window.PIXI?.TextureCache) {
      const originalLoadTexture = PIXI.Loader.shared.add?.bind(PIXI.Loader.shared);
      if (originalLoadTexture) {
        // Wrap texture loading to redirect bad icons
        const invalidIcon = "icons/svg/fire.svg";
        const fallbackIcon = "icons/svg/fire.svg";
        
        Hooks.on("loadTexture", (path) => {
          if (path === invalidIcon) {
            return fallbackIcon;
          }
        });
      }
    }
  });

  Hooks.on("preUpdateActor", async (actor, updateData, options, userId) => {
    if (!actor || actor.hasPlayerOwner) return; 

    const hpUpdate = updateData?.system?.attributes?.hp?.value;
    if (hpUpdate === undefined || hpUpdate === null) return;

    const nextHp = Number(hpUpdate);
    const currentHp = Number(actor.system?.attributes?.hp?.value ?? 0);

    if (currentHp > 0 && nextHp <= 0) {
      await handleEnemyDefeat(actor);
    }
  });

  // Fix invalid icons on ActiveEffects before they're created
  Hooks.on("preCreateActiveEffect", (effect, data, options, userId) => {
    if (data.icon === "icons/svg/fire.svg") {
      data.icon = "icons/svg/fire.svg";
    }
  });

  // Fix existing effects with invalid icons when scenes load
  Hooks.on("canvasReady", async () => {
    if (!game.user.isGM) return;
    console.log("Crimson Tithe | Fixing invalid effect icons on scene load...");
    
    const invalidIcon = "icons/svg/fire.svg";
    const fallbackIcon = "icons/svg/fire.svg";
    
    // Fix effects on current scene tokens
    if (canvas?.scene?.tokens) {
      for (const token of canvas.scene.tokens) {
        if (token.actor?.effects) {
          const updates = [];
          for (const effect of token.actor.effects) {
            if (effect.img === invalidIcon) {
              updates.push({ _id: effect.id, img: fallbackIcon });
            }
          }
          if (updates.length > 0) {
            await token.actor.updateEmbeddedDocuments("ActiveEffect", updates);
          }
        }
      }
    }

    console.log("Crimson Tithe | Scene canvas ready, effects checked.");
  });

  // Background fix: clean up all invalid icons when ready
  Hooks.once("ready", async () => {
    if (!game.user.isGM) return;
    console.log("Crimson Tithe | Running comprehensive effect icon cleanup...");
    
    const invalidIcon = "icons/svg/fire.svg";
    const fallbackIcon = "icons/svg/fire.svg";
    let fixed = 0;
    
    // Fix effects on all actors
    for (const actor of game.actors) {
      const updates = [];
      for (const effect of actor.effects) {
        if (effect.img === invalidIcon) {
          updates.push({ _id: effect.id, img: fallbackIcon });
          fixed++;
        }
      }
      if (updates.length > 0) {
        await actor.updateEmbeddedDocuments("ActiveEffect", updates);
      }
    }

    // Fix effects on all tokens in all scenes
    for (const scene of game.scenes) {
      for (const token of scene.tokens) {
        if (token.actor?.effects) {
          const updates = [];
          for (const effect of token.actor.effects) {
            if (effect.img === invalidIcon) {
              updates.push({ _id: effect.id, img: fallbackIcon });
              fixed++;
            }
          }
          if (updates.length > 0) {
            await token.actor.updateEmbeddedDocuments("ActiveEffect", updates);
          }
        }
      }
    }

    if (fixed > 0) {
      console.log(`Crimson Tithe | Fixed ${fixed} effects with invalid icons.`);
    }
  });

  for (const event of crimsonTitheEvents) {
    if (!event.hook || !event.condition || (event.cp === undefined && event.tp === undefined)) {
      continue;
    }

    if (event.description === "Triumphant Victory!") continue;

    Hooks.on(event.hook, async (...args) => {
      let actor = null;
      if (args[0] instanceof Actor) actor = args[0]; 
      else if (args[1] instanceof Actor) actor = args[1]; 
      else if (args[0]?.parent instanceof Actor) actor = args[0].parent; 
      else if (args[0]?.actor instanceof Actor) actor = args[0].actor; 
      else if (args[0]?.token?.actor instanceof Actor) actor = args[0].token.actor; 

      if (actor && actor.hasPlayerOwner) {
        try {
          if (await event.condition(...args)) { 
            await handleCrimsonTitheAward(actor, event);
          }
        } catch (e) {
          console.error(`Crimson Tithe | Error executing condition for event:`, e);
        }
      }
    });
  }
}

async function handleEnemyDefeat(defeatedEnemy) {
  if (!game.user?.isGM) return;

  const enemyLevel = defeatedEnemy.system?.details?.level || defeatedEnemy.system?.details?.cr || 1;
  const pcs = game.actors.filter(a => a.hasPlayerOwner && a.type === "character");

  for (const pc of pcs) {
    const pcLevel = pc.system?.details?.level || 1;
    const levelDiff = Math.max(0, enemyLevel - pcLevel);
    const cpAward = 5 + (levelDiff * 2);

    if (cpAward > 0) {
      await awardCrimsonPoints(pc, cpAward);
      const defeatEvent = {
        description: `Triumphant Victory over Level ${enemyLevel} Foe!`,
        cp: cpAward,
        tp: 0
      };
      await handleCrimsonTitheAward(pc, defeatEvent);
    }
  }
}

async function handleCrimsonTitheAward(actor, event) {
  if (!actor || !event) return;

  const pointsAwarded = event.cp ?? 0;
  const transformationPoints = event.tp ?? 0;

  if (pointsAwarded > 0) {
    await awardCrimsonPoints(actor, pointsAwarded);
  }
  if (transformationPoints > 0) {
    await awardTransformationPoints(actor, transformationPoints);
  }

  const totalImpact = Math.abs(pointsAwarded) + Math.abs(transformationPoints);
  const soundAndImageAmount = Math.max(1, Math.min(10, totalImpact));

  playCrimsonTitheAudio(soundAndImageAmount); 
  postCrimsonTitheChatCard(actor, pointsAwarded, transformationPoints, event.description);

  const socket = game[MODULE_ID]?.Tithe?.socket();
  if (socket) {
    socket.executeForEveryone("showAwardPopup", actor.id, soundAndImageAmount, event.description);
    return;
  }

  try {
    const { showCrimsonTithePopUp } = await import("./crimson-tithe-scripts-ui/crimson-tithe-scripts-ui-popUpUI.js");
    showCrimsonTithePopUp(actor, soundAndImageAmount, event.description);
  } catch (e) {
    console.error("Crimson Tithe | Popup fallback failed", e);
  }
}

export function initCrimsonTitheTracker() {
  if (game.user.isGM) {
    registerCrimsonTitheEventHooks();
  }
}
