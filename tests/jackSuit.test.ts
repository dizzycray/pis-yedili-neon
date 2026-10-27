import { describe, expect, it } from 'vitest';
import { chooseAction, chooseSuitFor } from '../src/game/ai';
import { applyAction } from '../src/game/engine';
import { getLegalMoves, isLegalPlay } from '../src/game/rules';
import { c, makePlayingState } from './helpers';

const base = () =>
  makePlayingState({
    hands: [
      [c('kupa', 'J'), c('maca', '2'), c('maca', '5')],
      [c('karo', '3'), c('maca', 'K'), c('sinek', 'J'), c('kupa', '4')],
      [c('karo', '6'), c('karo', '8')],
    ],
    discard: [c('kupa', '9')],
    drawPile: [c('karo', 'Q'), c('sinek', '2')],
  });

describe('Vale ile renk seçimi', () => {
  it('Vale atılınca sıra geçmez, oyuncu renk seçmeyi bekler', () => {
    const n = applyAction(base(), { type: 'play', player: 0, cardId: 'kupa-J' });
    expect(n.awaitingSuit).toBe(true);
    expect(n.currentPlayer).toBe(0);
    expect(n.phase).toBe('playing');
  });

  it('seçim sırasında hiçbir oyuncu başka hamle yapamaz', () => {
    const n = applyAction(base(), { type: 'play', player: 0, cardId: 'kupa-J' });
    expect(getLegalMoves(n, 0)).toEqual([]);
    expect(() => applyAction(n, { type: 'play', player: 0, cardId: 'maca-2' })).toThrow();
    expect(() => applyAction(n, { type: 'draw', player: 0 })).toThrow();
    expect(() => applyAction(n, { type: 'play', player: 1, cardId: 'karo-3' })).toThrow();
    expect(() => applyAction(n, { type: 'chooseSuit', player: 1, suit: 'karo' })).toThrow();
  });

  it('seçilen renk sonraki oyuncu için geçerli olur; aynı değer (Vale) de oynanabilir', () => {
    let n = applyAction(base(), { type: 'play', player: 0, cardId: 'kupa-J' });
    n = applyAction(n, { type: 'chooseSuit', player: 0, suit: 'maca' });
    expect(n.currentPlayer).toBe(1);
    expect(n.chosenSuit).toBe('maca');
    // Üst kart Kupa Vale olsa da Kupa 4 artık oynanamaz.
    expect(getLegalMoves(n, 1).map((x) => x.id).sort()).toEqual(['maca-K', 'sinek-J']);
    expect(() => applyAction(n, { type: 'play', player: 1, cardId: 'kupa-4' })).toThrow();
    n = applyAction(n, { type: 'play', player: 1, cardId: 'maca-K' });
    expect(n.chosenSuit).toBeNull();
    expect(n.currentPlayer).toBe(2);
  });

  it('seçilen rengi oynayamayan çeker; renk isteği bir kart oynanana kadar sürer', () => {
    let n = applyAction(base(), { type: 'play', player: 0, cardId: 'kupa-J' });
    n = applyAction(n, { type: 'chooseSuit', player: 0, suit: 'sinek' });
    n = applyAction(n, { type: 'play', player: 1, cardId: 'sinek-J' }); // Vale üstüne Vale
    expect(n.awaitingSuit).toBe(true);
    n = applyAction(n, { type: 'chooseSuit', player: 1, suit: 'kupa' });
    expect(n.currentPlayer).toBe(2);
    expect(getLegalMoves(n, 2)).toEqual([]);
    n = applyAction(n, { type: 'draw', player: 2 }); // Karo Kız çeker: uymaz, sıra geçer
    expect(n.currentPlayer).toBe(0);
    expect(n.chosenSuit).toBe('kupa');
  });

  it('7 cezası ve As etkisi Vale kuralından etkilenmez', () => {
    const s = makePlayingState({
      hands: [[c('kupa', '7'), c('kupa', 'A'), c('kupa', '2')], [c('maca', '3')], [c('karo', '4')]],
      discard: [c('kupa', '9')],
    });
    const seven = applyAction(s, { type: 'play', player: 0, cardId: 'kupa-7' });
    expect(seven.pendingPenalty).toBe(4);
    expect(seven.awaitingSuit).toBe(false);
    const ace = applyAction(s, { type: 'play', player: 0, cardId: 'kupa-A' });
    expect(ace.currentPlayer).toBe(2);
  });
});

describe('Vale her kartın üzerine atılabilir', () => {
  it('renk ve değer uymasa da Vale oynanabilir; 7 cezası ve Sinek açılışı istisnadır', () => {
    expect(isLegalPlay(c('maca', 'J'), c('kupa', '9'), 0)).toBe(true);
    expect(isLegalPlay(c('karo', 'J'), c('sinek', 'A'), 0, 'kupa')).toBe(true);
    expect(isLegalPlay(c('maca', 'J'), c('kupa', '7'), 4)).toBe(false);
    expect(isLegalPlay(c('maca', 'J'), null, 0)).toBe(false);
    expect(isLegalPlay(c('sinek', 'J'), null, 0)).toBe(true);
  });

  it('uymayan karta atılan Vale sembol seçimini başlatır', () => {
    const s = makePlayingState({
      hands: [[c('maca', 'J'), c('karo', '2')], [c('karo', '3')]],
      discard: [c('kupa', '9')],
    });
    let n = applyAction(s, { type: 'play', player: 0, cardId: 'maca-J' });
    expect(n.awaitingSuit).toBe(true);
    n = applyAction(n, { type: 'chooseSuit', player: 0, suit: 'karo' });
    expect(getLegalMoves(n, 1).map((x) => x.id)).toEqual(['karo-3']);
  });
});

describe('yapay zekâ renk seçimi', () => {
  it('elinde en çok kartı olan rengi seçer (Valeler sayılmaz)', () => {
    // Kupa: 3 kart; Maça: 2 kart (+ sayılmayan Vale)
    expect(
      chooseSuitFor([c('kupa', '2'), c('kupa', '5'), c('kupa', '8'), c('maca', 'K'), c('maca', 'J'), c('maca', 'Q')]),
    ).toBe('kupa');
    // Eşitlikte puanı yüksek renk
    expect(chooseSuitFor([c('karo', '2'), c('sinek', 'K')])).toBe('sinek');
  });

  it('Vale attıktan sonra bot renk seçme eylemini döndürür', () => {
    const s = makePlayingState({
      hands: [[c('karo', '2'), c('karo', '5'), c('maca', '3')], [c('maca', 'K')]],
      discard: [c('kupa', 'J')],
    });
    const waiting = { ...s, awaitingSuit: true };
    expect(chooseAction(waiting, 0)).toEqual({ type: 'chooseSuit', player: 0, suit: 'karo' });
  });
});
