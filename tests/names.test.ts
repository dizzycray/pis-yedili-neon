import { describe, expect, it } from 'vitest';
import { applyAction, createGame } from '../src/game/engine';
import { BOT_NAMES, withBotNames } from '../src/game/names';
import { seeded } from './helpers';

const single = [
  { name: 'Ayşe', isHuman: true },
  { name: '', isHuman: false },
  { name: '', isHuman: false },
  { name: '', isHuman: false },
];

describe('bot adları', () => {
  it('üç sabit Türkçe ad, her oyunda aynı sırayla verilir', () => {
    const first = withBotNames(single).map((c) => c.name);
    const again = withBotNames(single).map((c) => c.name);
    expect(first).toEqual(['Ayşe', ...BOT_NAMES]);
    expect(again).toEqual(first);
  });

  it('insan oyuncunun ve elle yazılmış bot adının değişmez; aynı ad iki kez kullanılmaz', () => {
    const out = withBotNames([
      { name: 'Neon Necla', isHuman: true },
      { name: 'Robo', isHuman: false },
      { name: '', isHuman: false },
    ]);
    expect(out.map((c) => c.name)).toEqual(['Neon Necla', 'Robo', 'Krom Kemal']);
  });

  it('adlar 4 tur boyunca aynı kalır', () => {
    let g = createGame(withBotNames(single), seeded(3));
    const names = g.players.map((p) => p.name);
    for (let r = 0; r < 3; r++) {
      g = applyAction({ ...g, phase: 'roundEnd' }, { type: 'nextRound' });
      expect(g.players.map((p) => p.name)).toEqual(names);
    }
  });
});
