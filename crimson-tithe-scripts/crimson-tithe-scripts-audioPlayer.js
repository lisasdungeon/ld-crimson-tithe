// crimson-tithe-scripts-audioPlayer.js
const MODULE_ID = "ld-crimson-tithe";
const SOUND_BASE_PATH = `modules/${MODULE_ID}/crimson-tithe-assets/crimson-tithe-sounds`;
const PHRASES_PER_CP = 5;

export async function playCrimsonTitheAudio(cpValue) {
  if (cpValue === undefined || cpValue === null || Number.isNaN(Number(cpValue))) {
    return null;
  }

  const points = Math.floor(Number(cpValue));
  if (points < 1 || points > 10) return null;

  const phraseIdx = Math.floor(Math.random() * PHRASES_PER_CP) + 1;
  const fileName = `cp_${points}_phrase_${phraseIdx}.mp3`;
  const filePath = `${SOUND_BASE_PATH}/${fileName}`;

  const helper = foundry?.audio?.AudioHelper ?? globalThis.AudioHelper ?? null;

  try {
    if (helper?.play) {
      const result = helper.play({ src: filePath, volume: 0.8, autoplay: true, loop: false }, true);
      if (result?.catch) result.catch(() => {});
      return filePath;
    }
    if (game?.audio?.play) {
      const result = game.audio.play(filePath, { volume: 0.8, loop: false });
      if (result?.catch) result.catch(() => {});
      return filePath;
    }
  } catch (err) {
    console.error(`[ld-crimson-tithe] Audio play failed: ${filePath}`, err);
  }
  return null;
}
