import { describe, expect, it } from 'vitest';
import { createDeck, shuffle } from '../src/game/deck';
import { previewDeckCut, resolveDeckCut } from '../src/game/deckCut';
import { applyAction, createGame } from '../src/game/engine';
import type { Card } from '../src/game/types';
import { c, ids, seeded } from './helpers';

/** Bilinen bir desteyi kurar: ilk kartlar verilen sırada, kalanı deste sırasıyla. */
function deckWithTop(top: Card[]): Card[] {
  const used = new Set(top.map((x) => x.id));
  return [...top, ...createDeck().filter((x) => !used.has(x.id))];
}

const top10 = [
  c('kupa', '2'), c('kupa', '3'), c('kupa', '4'), c('kupa', '5'), c('kupa', '6'),
  c('kupa', '8'), c('kupa', '9'), c('karo', 'J'), c('karo', '2'), c('karo', '3'),
];

describe('resolveDeckCut', () => {
  it('alt kart ve en fazla 7 kartlık dizi doğru belirlenir', () => {
    const p = previewDeckCut(deckWithTop(top10), 10);
    expect(p.bottomCard.id).toBe('karo-3');
    expect(p.sequence.map((x) => x.id)).toEqual([
      'karo-3', 'karo-2', 'karo-J', 'kupa-9', 'kupa-8', 'kupa-6', 'kupa-5',
    ]);
    expect(p.eligible).toBe(true);
    expect(p.allowedCounts).toEqual([4, 5, 6, 7]);
  });

  it('dizide J/A/7 yoksa kart alınamaz', () => {
    const plain = [
      c('kupa', '2'), c('kupa', '3'), c('kupa', '4'), c('kupa', '5'), c('kupa', '6'),
      c('kupa', '8'), c('kupa', '9'), c('karo', '2'), c('karo', '3'),
    ];
    const p = previewDeckCut(deckWithTop(plain), 9);
    expect(p.eligible).toBe(false);
    expect(() => resolveDeckCut(deckWithTop(plain), 9, 4)).toThrow();
    const r = resolveDeckCut(deckWithTop(plain), 9, null);
    expect(r.claimed).toEqual([]);
    expect(r.deck).toHaveLength(52);
  });

  it('ardışık k kart alınır ve deste kayıpsız yeniden kurulur', () => {
    const deck = deckWithTop(top10);
    for (const k of [4, 5, 6, 7]) {
      const r = resolveDeckCut(deck, 10, k);
      expect(r.claimed).toHaveLength(k);
      expect(r.claimed.map((x) => x.id)).toEqual(r.preview.sequence.slice(0, k).map((x) => x.id));
      expect(r.deck).toHaveLength(52 - k);
      expect(ids([...r.claimed, ...r.deck])).toEqual(ids(deck));
      // Alt yarı üste gelir, kalan üst yarı alta eklenir.
      expect(r.deck.slice(0, 42).map((x) => x.id)).toEqual(deck.slice(10).map((x) => x.id));
      expect(r.deck.slice(42).map((x) => x.id)).toEqual(deck.slice(0, 10 - k).map((x) => x.id));
    }
  });

  it('elde kalan yarı küçükse izin verilen sayı sınırlanır; geçersiz kesme reddedilir', () => {
    const deck = [c('maca', 'A'), ...createDeck().filter((x) => x.id !== 'maca-A')];
    expect(previewDeckCut(deck, 5).allowedCounts).toEqual([4, 5]);
    expect(previewDeckCut(deck, 3).eligible).toBe(false);
    expect(() => previewDeckCut(deck, 0)).toThrow();
    expect(() => previewDeckCut(deck, 52)).toThrow();
  });

  it('rastgele kesmelerde kart kopyalanmaz veya kaybolmaz', () => {
    const rng = seeded(9);
    for (let i = 0; i < 200; i++) {
      const deck = shuffle(createDeck(), rng);
      const pos = 1 + Math.floor(rng() * 51);
      const p = previewDeckCut(deck, pos);
      const k = p.eligible ? p.allowedCounts[Math.floor(rng() * p.allowedCounts.length)] : null;
      const r = resolveDeckCut(deck, pos, k);
      expect(ids([...r.claimed, ...r.deck])).toEqual(ids(deck));
    }
  });
});

describe('kesme tur içinde', () => {
  it('kesen oyuncu aldığı kartları tutar ve eli 7ye tamamlanır; kesen her tur değişir', () => {
    let g = createGame([1, 2, 3, 4].map((i) => ({ name: `P${i}`, isHuman: false })), seeded(5));
    const cutters: number[] = [];
    for (let round = 0; round < 4; round++) {
      cutters.push(g.cutterIndex);
      g = { ...g, shuffledDeck: deckWithTop(top10) };
      g = applyAction(g, { type: 'cut', position: 10 });
      g = applyAction(g, { type: 'claim', count: 5 });
      const hand = g.players[g.cutterIndex].hand.map((x) => x.id);
      expect(hand.slice(0, 5)).toEqual(['karo-3', 'karo-2', 'karo-J', 'kupa-9', 'kupa-8']);
      expect(g.players.every((p) => p.hand.length === 7)).toBe(true);
      expect(g.currentPlayer).toBe((g.cutterIndex + 1) % 4);
      g = { ...g, phase: 'roundEnd' };
      g = applyAction(g, { type: 'nextRound' });
    }
    expect(cutters).toEqual([0, 1, 2, 3]);
    expect(g.phase).toBe('gameOver');
  });
});
