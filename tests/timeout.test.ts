import { describe, expect, it } from 'vitest';
import { applyAction } from '../src/game/engine';
import { c, makePlayingState } from './helpers';

describe('hamle süresi doldu', () => {
  it('oynanabilir kart olsa bile kart oynanmaz: 1 kart çekilir ve sıra geçer', () => {
    const s = makePlayingState({
      hands: [[c('kupa', '2'), c('kupa', '5')], [c('maca', '3')]],
      discard: [c('kupa', '9')],
      drawPile: [c('kupa', 'K'), c('karo', 'Q')],
    });
    const n = applyAction(s, { type: 'timeout', player: 0 });
    expect(n.discardPile.map((x) => x.id)).toEqual(['kupa-9']);
    expect(n.players[0].hand.map((x) => x.id)).toEqual(['kupa-2', 'kupa-5', 'kupa-K']);
    expect(n.currentPlayer).toBe(1);
    expect(n.drawnCardId).toBeNull();
    expect(n.events.at(-1)).toMatchObject({ player: 0, text: 'SÜRE DOLDU · +1 KART' });
  });

  it('çekilen kart beklerken süre dolarsa ek kart çekilmeden sıra geçer', () => {
    const s = makePlayingState({
      hands: [[c('maca', '2')], [c('maca', '3')]],
      discard: [c('kupa', '9')],
      drawPile: [c('kupa', 'K')],
    });
    const drawn = applyAction(s, { type: 'draw', player: 0 });
    expect(drawn.drawnCardId).toBe('kupa-K');
    const n = applyAction(drawn, { type: 'timeout', player: 0 });
    expect(n.players[0].hand).toHaveLength(2);
    expect(n.currentPlayer).toBe(1);
  });

  it('bekleyen 7 cezası varsa biriken ceza çekilir', () => {
    const s = makePlayingState({
      hands: [[c('kupa', '2')], [c('maca', '7'), c('maca', '3')]],
      discard: [c('kupa', '7')],
      drawPile: [c('karo', '2'), c('karo', '3'), c('karo', '4'), c('karo', '5')],
      current: 1,
      pendingPenalty: 4,
    });
    const n = applyAction(s, { type: 'timeout', player: 1 });
    expect(n.players[1].hand).toHaveLength(6);
    expect(n.pendingPenalty).toBe(0);
    expect(n.currentPlayer).toBe(0);
  });

  it('Vale sonrası sembol seçilmediyse sembol seçilir, kart çekilmez', () => {
    const s = makePlayingState({
      hands: [[c('kupa', 'J'), c('karo', '2'), c('karo', '5')], [c('maca', '3')]],
      discard: [c('kupa', '9')],
      drawPile: [c('sinek', 'K')],
    });
    const waiting = applyAction(s, { type: 'play', player: 0, cardId: 'kupa-J' });
    const n = applyAction(waiting, { type: 'timeout', player: 0 });
    expect(n.chosenSuit).toBe('karo');
    expect(n.players[0].hand).toHaveLength(2);
    expect(n.currentPlayer).toBe(1);
  });

  it('sırası olmayan oyuncu için süre eylemi reddedilir', () => {
    const s = makePlayingState({ hands: [[c('kupa', '2')], [c('maca', '3')]], discard: [c('kupa', '9')] });
    expect(() => applyAction(s, { type: 'timeout', player: 1 })).toThrow();
  });
});
