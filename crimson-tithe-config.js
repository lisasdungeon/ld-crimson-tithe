// crimson-tithe-config.js
//
// This is the central configuration file for the Crimson Tithe system.
// All events that can award Crimson Points are defined here.
//
// You can add, remove, or edit any event in this list.
//
// Each event MUST have this structure:
//  {
//   hook: "hook.name.to.listen.for",
//   cp: 1, // The number of CP to award
//   description: "A description for the chat/popup",
//   condition: (args...) =>  {
//     // A function that checks if the conditions are met
//     // It MUST return true or false.
//     // The arguments (args...) change depending on the hook.
//     return true;
//   }
// }
//
const getNestedProperty = (object, path) =>  {
  if (!object || !path) return undefined;
  if (globalThis.foundry?.utils?.getProperty) {
    return foundry.utils.getProperty(object, path);
  }

  return path.split('.').reduce((acc, part) => (acc?.[part] ?? undefined), object);
};

export const crimsonTitheEvents = [

  // --- EXAMPLE EVENTS (You can change these) ---

  /**
   * Event: Critical Skill Check
   * Hook: dnd5e.rollSkill
   * Awards: 1 CP
   * Condition: The player rolls a natural 20 on the d20.
   */
   {
    hook: "dnd5e.rollSkill",
    cp: 1,
    description: "Critical Skill Check!",
    condition: (roll, actor, data) =>  {
      // roll.dice[0].total gets the result of the first die (the d20)
      return roll.dice[0].total === 20;
    }
  },

  /**
   * Event: Critical Saving Throw
   * Hook: dnd5e.rollSavingThrow
   * Awards: 1 CP
   * Condition: The player rolls a natural 20 on the d20.
   */
   {
    hook: "dnd5e.rollSavingThrow",
    cp: 1,
    description: "Critical Saving Throw!",
    condition: (roll, actor) =>  {
      // roll.dice[0].total gets the result of the first die (the d20)
      return roll.dice[0].total === 20;
    }
  },

  /**
   * Event: Reduced to 0 HP
   * Hook: preUpdateActor
   * Awards: 5 CP
   * Condition: The actor's HP is being updated to 0.
   */
   {
    hook: "preUpdateActor",
    cp: 5,
    description: "Fell in Battle!",
    condition: (actor, updateData) =>  {
      if (!actor || !updateData) return false;
  const hpUpdate = getNestedProperty(updateData, "system.attributes.hp.value");
      if (hpUpdate === undefined || hpUpdate === null) return false;
      const nextHp = Number(hpUpdate);
      if (!Number.isFinite(nextHp)) return false;
      const currentHp = Number(actor.system?.attributes?.hp?.value ?? 0);
      const wasAboveZero = currentHp > 0;
      const isDroppingToZero = nextHp <= 0;
      return wasAboveZero && isDroppingToZero;
    }
  },

  /**
   * Event: Afflicted with Fear
   * Hook: createActiveEffect
   * Awards: 2 CP
   * Condition: An active effect with "Frightened" in its name is applied.
   */
   {
    hook: "createActiveEffect",
    cp: 2,
    description: "Afflicted by Fear",
    condition: (effect) =>  {
      // dnd5e / Foundry v10+ use name; legacy docs used label. Also check statuses.
      const name = String(effect?.name ?? effect?.label ?? "").toLowerCase();
      if (name.includes("frightened") || name.includes("fear")) return true;
      if (effect?.statuses?.has?.("frightened")) return true;
      return false;
    }
  }

  // --- ADD MORE EVENTS HERE ---
  //  {
  //   hook: "dnd5e.rollSpell",
  //   cp: 1,
  //   description: "Cast a 9th Level Spell",
  //   condition: (item, actor, data) =>  {
  //     return item.system.level === 9;
  //   }
  // }

];
