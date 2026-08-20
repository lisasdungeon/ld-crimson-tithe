import test from 'node:test';
import assert from 'node:assert/strict';
import { migrateLegacyFlags } from '../ld-legacy-migrate.js';
import { safeGetFlag } from '../crimson-tithe-scripts/crimson-tithe-utils.js';

test('safeGetFlag reads leftover rnk-crimson-blood flags without throwing', () => {
  const actor = {
    flags: { 'rnk-crimson-blood': { liveCP: 7 } },
    getFlag: () => { throw new Error('Flag scope "rnk-crimson-blood" is not valid or not currently active'); }
  };
  globalThis.game = { system: { id: 'dnd5e' }, modules: { get: () => ({ active: false }) } };
  try {
    assert.equal(safeGetFlag(actor, 'rnk-crimson-blood', 'liveCP', 0), 7);
  } finally {
    delete globalThis.game;
  }
});

test('migrateLegacyFlags no-ops without game.actors', async () => {
  const moved = await migrateLegacyFlags('ld-test', 'rnk-test');
  assert.equal(moved, 0);
});

test('migrateLegacyFlags copies empty current flags from legacy', async () => {
  const updates = [];
  const actor = {
    name: 'Test',
    flags: { 'rnk-test': { n: 3 } },
    update: async (data) => { updates.push(data); }
  };
  globalThis.game = { actors: [actor] };
  globalThis.foundry = { utils: { deepClone: (v) => JSON.parse(JSON.stringify(v)) } };
  try {
    const moved = await migrateLegacyFlags('ld-test', 'rnk-test');
    assert.equal(moved, 1);
    assert.deepEqual(updates[0], { 'flags.ld-test': { n: 3 } });
  } finally {
    delete globalThis.game;
    delete globalThis.foundry;
  }
});
