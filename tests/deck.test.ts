import { describe, expect, it } from 'vitest';
import { createDeck, drawFromPile, shuffle } from '../src/game/deck';
import { allCards, applyAction, createGame } from '../src/game/engine';
import { c, ids, seeded } from './helpers';

describe('deste bütünlüğü', () => {
  it('52 benzersiz kart, 4 renk x 13 değer', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(52);
    expect(new Set(deck.map((x) => x.id)).size).toBe(52);
    for (const suit of ['sinek', 'kupa', 'karo', 'maca']) {
      expect(deck.filter((x) => x.suit === suit)).toHaveLength(13);
    }
  });

  it('karıştırma kart eklemez/kaybetmez', () => {
    const deck = createDeck();
    const s = shuffle(deck, seeded(42));
    expect(ids(s)).toEqual(ids(deck));
    expect(s.map((x) => x.id)).not.toEqual(deck.map((x) => x.id));
  });

  it('dağıtımdan sonra 52 kart korunur ve herkesin 7 kartı vardır', () => {
    for (let seed = 1; seed <= 30; seed++) {
      let g = createGame(
        [1, 2, 3, 4].map((i) => ({ name: `P${i}`, isHuman: false })),
        seeded(seed),
      );
      g = applyAction(g, { type: 'cut', position: 7 + (seed % 39) });
      const count = g.cutPreview!.allowedCounts.at(-1) ?? null;
      g = applyAction(g, { type: 'claim', count });
      expect(g.players.every((p) => p.hand.length === 7)).toBe(true);
      expect(ids(allCards(g))).toEqual(ids(createDeck()));
      expect(g.drawPile).toHaveLength(52 - 28);
    }
  });
});

describe('tükenen deste', () => {
  it('açık yığını (üst kart hariç) karıştırıp yeniden deste yapar', () => {
    const discard = [c('kupa', '2'), c('kupa', '3'), c('kupa', '4')];
    const r = drawFromPile([], discard, 2, seeded(3));
    expect(r.reshuffled).toBe(true);
    expect(r.cards).toHaveLength(2);
    expect(r.discardPile).toEqual([c('kupa', '4')]);
    expect(ids([...r.cards, ...r.drawPile, ...r.discardPile])).toEqual(ids(discard));
  });

  it('hiç kart yoksa hata vermeden çekilebilen kadar döner', () => {
    const r = drawFromPile([c('maca', 'K')], [c('kupa', '4')], 5);
    expect(r.cards).toEqual([c('maca', 'K')]);
    expect(r.drawPile).toEqual([]);
    expect(r.discardPile).toEqual([c('kupa', '4')]);
  });
});
