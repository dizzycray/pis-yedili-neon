import { describe, expect, it } from 'vitest';
import { applyAction, IllegalActionError } from '../src/game/engine';
import { getLegalMoves, isLegalPlay } from '../src/game/rules';
import { c, makePlayingState } from './helpers';

describe('geçerli hamleler', () => {
  it('aynı renk ya da aynı değer oynanabilir', () => {
    const top = c('kupa', '9');
    expect(isLegalPlay(c('kupa', '2'), top, 0)).toBe(true);
    expect(isLegalPlay(c('maca', '9'), top, 0)).toBe(true);
    expect(isLegalPlay(c('maca', '2'), top, 0)).toBe(false);
  });

  it('açılışta yalnızca Sinek', () => {
    expect(isLegalPlay(c('sinek', 'K'), null, 0)).toBe(true);
    expect(isLegalPlay(c('kupa', 'K'), null, 0)).toBe(false);
  });

  it('kural dışı kart reddedilir', () => {
    const s = makePlayingState({
      hands: [[c('maca', '2'), c('kupa', '3')], [c('karo', '5')]],
      discard: [c('kupa', '9')],
    });
    expect(getLegalMoves(s, 0).map((x) => x.id)).toEqual(['kupa-3']);
    expect(() => applyAction(s, { type: 'play', player: 0, cardId: 'maca-2' })).toThrow(
      IllegalActionError,
    );
    expect(() => applyAction(s, { type: 'play', player: 1, cardId: 'karo-5' })).toThrow();
  });
});

describe('kart çekme', () => {
  it('oynanabilir kart varken çekilemez', () => {
    const s = makePlayingState({
      hands: [[c('kupa', '3')], [c('karo', '5')]],
      discard: [c('kupa', '9')],
      drawPile: [c('maca', 'K')],
    });
    expect(() => applyAction(s, { type: 'draw', player: 0 })).toThrow();
  });

  it('oynanamayan kart çekilirse sıra geçer', () => {
    const s = makePlayingState({
      hands: [[c('maca', '2'), c('maca', '3')], [c('karo', '5')]],
      discard: [c('kupa', '9')],
      drawPile: [c('karo', 'K'), c('karo', 'Q')],
    });
    const n = applyAction(s, { type: 'draw', player: 0 });
    expect(n.players[0].hand).toHaveLength(3);
    expect(n.drawPile).toHaveLength(1);
    expect(n.currentPlayer).toBe(1);
    expect(n.drawnCardId).toBeNull();
  });

  it('oynanabilir kart çekilirse oynamak isteğe bağlıdır (tam olarak 1 kart)', () => {
    const s = makePlayingState({
      hands: [[c('maca', '2'), c('maca', '3')], [c('karo', '5')]],
      discard: [c('kupa', '9')],
      drawPile: [c('kupa', 'K'), c('karo', 'Q')],
    });
    const n = applyAction(s, { type: 'draw', player: 0 });
    expect(n.currentPlayer).toBe(0);
    expect(n.drawnCardId).toBe('kupa-K');
    expect(getLegalMoves(n, 0).map((x) => x.id)).toEqual(['kupa-K']);
    expect(() => applyAction(n, { type: 'draw', player: 0 })).toThrow();
    const passed = applyAction(n, { type: 'pass', player: 0 });
    expect(passed.currentPlayer).toBe(1);
    expect(passed.players[0].hand).toHaveLength(3);
    const played = applyAction(n, { type: 'play', player: 0, cardId: 'kupa-K' });
    expect(played.discardPile.at(-1)!.id).toBe('kupa-K');
    expect(played.currentPlayer).toBe(1);
  });

  it('açılışta Sinek yoksa Sinek bulana kadar çeker, sonra Sinek ile başlar', () => {
    const s = makePlayingState({
      hands: [[c('kupa', '2'), c('karo', '3')], [c('karo', '5')]],
      drawPile: [c('maca', 'K'), c('kupa', 'Q'), c('sinek', '4'), c('karo', 'Q')],
    });
    expect(getLegalMoves(s, 0)).toHaveLength(0);
    const n = applyAction(s, { type: 'draw', player: 0 });
    expect(n.players[0].hand).toHaveLength(5);
    expect(n.currentPlayer).toBe(0);
    expect(getLegalMoves(n, 0).map((x) => x.id)).toEqual(['sinek-4']);
    const p = applyAction(n, { type: 'play', player: 0, cardId: 'sinek-4' });
    expect(p.discardPile.map((x) => x.id)).toEqual(['sinek-4']);
  });
});

describe('7 cezası', () => {
  const base = () =>
    makePlayingState({
      hands: [
        [c('kupa', '7'), c('kupa', '2')],
        [c('maca', '7'), c('maca', '3')],
        [c('karo', '4'), c('karo', '5')],
      ],
      discard: [c('kupa', '9')],
      drawPile: Array.from({ length: 10 }, (_, i) =>
        c('sinek', String(i + 1 === 1 ? 'A' : i + 1) as never),
      ),
    });

  it('7 sonraki oyuncuya 4 kart ceza yaratır', () => {
    const n = applyAction(base(), { type: 'play', player: 0, cardId: 'kupa-7' });
    expect(n.pendingPenalty).toBe(4);
    expect(n.currentPlayer).toBe(1);
    expect(getLegalMoves(n, 1).map((x) => x.id)).toEqual(['maca-7']);
    expect(() => applyAction(n, { type: 'draw', player: 1 })).toThrow();
  });

  it('7 ile karşılık verilince ceza 4 artar; alamayan cezayı çeker ve sırası geçer', () => {
    let n = applyAction(base(), { type: 'play', player: 0, cardId: 'kupa-7' });
    n = applyAction(n, { type: 'play', player: 1, cardId: 'maca-7' });
    expect(n.pendingPenalty).toBe(8);
    expect(n.currentPlayer).toBe(2);
    expect(getLegalMoves(n, 2)).toHaveLength(0);
    n = applyAction(n, { type: 'acceptPenalty', player: 2 });
    expect(n.players[2].hand).toHaveLength(10);
    expect(n.pendingPenalty).toBe(0);
    expect(n.currentPlayer).toBe(0);
  });

  it('7 olan oyuncu karşılık vermemeyi seçebilir', () => {
    let n = applyAction(base(), { type: 'play', player: 0, cardId: 'kupa-7' });
    n = applyAction(n, { type: 'acceptPenalty', player: 1 });
    expect(n.players[1].hand).toHaveLength(6);
    expect(n.currentPlayer).toBe(2);
  });

  it('deste yetersizse çekilebilen kadar kart çeker', () => {
    const s = makePlayingState({
      hands: [[c('kupa', '2')], [c('maca', '3')]],
      discard: [c('kupa', '7')],
      drawPile: [c('karo', 'K')],
      current: 1,
      pendingPenalty: 4,
    });
    const n = applyAction(s, { type: 'acceptPenalty', player: 1 });
    expect(n.players[1].hand).toHaveLength(2);
    expect(n.pendingPenalty).toBe(0);
  });
});

describe('As', () => {
  it('sonraki oyuncuyu atlar', () => {
    const s = makePlayingState({
      hands: [[c('kupa', 'A'), c('kupa', '2')], [c('maca', '3')], [c('karo', '4')]],
      discard: [c('kupa', '9')],
    });
    const n = applyAction(s, { type: 'play', player: 0, cardId: 'kupa-A' });
    expect(n.currentPlayer).toBe(2);
  });

  it('iki oyuncuda As oynayan tekrar oynar', () => {
    const s = makePlayingState({
      hands: [[c('kupa', 'A'), c('kupa', '2')], [c('maca', '3')]],
      discard: [c('kupa', '9')],
    });
    expect(applyAction(s, { type: 'play', player: 0, cardId: 'kupa-A' }).currentPlayer).toBe(0);
  });
});
