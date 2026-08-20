// crimson-tithe-scripts-chatNotifier.js
const MODULE_ID = "ld-crimson-tithe";

export async function postCrimsonTitheChatCard(actor, points, eventDescription) {
  if (!actor) return;
  points = Number(points);
  if (!points || points <= 0) return;

  const actorName = actor.name || "Unknown";
  const pointSingular = game.i18n.localize("CT.chatCard.pointSingular");
  const pointPlural = game.i18n.localize("CT.chatCard.pointPlural");
  const cpText = points === 1 ? pointSingular : pointPlural;

  const title = game.i18n.localize("CT.chatCard.title");
  const speakerAlias = game.i18n.localize("CT.chatCard.speakerAlias");
  const awardMsg = game.i18n.format("CT.chatCard.awardMessage", {
    actorName,
    points,
    pointsText: cpText
  });
  const eventMsg = game.i18n.format("CT.chatCard.eventLabel", { eventDescription });
  const imagePath = `modules/${MODULE_ID}/crimson-tithe-assets/crimson-tithe-assets-pics/1.png`;

  const content = `
    <div class="crimson-tithe-chat-card" style="border: 1px solid #7a0000; background: #2b0000; color: #ffaaaa; padding: 5px; border-radius: 3px;">
      <h3 style="color: #ff4444; margin: 0 0 5px 0; border-bottom: 1px solid #7a0000; padding-bottom: 3px;">${title}</h3>
      <p style="margin: 3px 0;">${awardMsg}</p>
      <p style="margin: 3px 0; font-style: italic; opacity: 0.8;">${eventMsg}</p>
      <img src="${imagePath}" alt="Crimson Icon" style="width:30px; height: 30px; display:inline-block; vertical-align:middle; border: none; border-radius: 4px; margin-top: 5px;">
    </div>`;

  const chatData = {
    user: game.user.id,
    speaker: ChatMessage.getSpeaker({ alias: speakerAlias }),
    content
  };

  // Foundry v12+ styles; fall back gracefully on older cores.
  const styles = CONST?.CHAT_MESSAGE_STYLES ?? CONST?.CHAT_MESSAGE_TYPES;
  if (styles?.OTHER != null) {
    if (CONST.CHAT_MESSAGE_STYLES) chatData.style = styles.OTHER;
    else chatData.type = styles.OTHER;
  }

  try {
    await ChatMessage.create(chatData);
  } catch (error) {
    console.error(game.i18n?.localize?.("CT.logs.chatCreateFailed") ?? "Chat create failed", error, chatData);
  }
}
