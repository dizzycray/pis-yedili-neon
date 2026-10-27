import { describe, expect, it } from 'vitest';
import { applyAction } from '../src/game/engine';
import { cardValue, getWinners, handValue } from '../src/game/scoring';
import { c, makePlayingState } from './helpers';

describe('puanlama', () => {
  it('kart değerleri', () => {
    expect(cardValue(c('kupa', 'A'))).toBe(11);
    expect(cardValue(c('kupa', '2'))).toBe(2);
    expect(cardValue(c('kupa', '9'))).toBe(9);
    for (const r of ['10', 'J', 'Q', 'K'] as const) expect(cardValue(c('kupa', r))).toBe(10);
    expect(handValue([c('maca', 'A'), c('maca', '7'), c('maca', 'K')])).toBe(28);
  });

  it('elini bitiren 0 alır, diğerleri el toplamını; puanlar turlar boyunca birikir', () => {
    const s = makePlayingState({
      hands: [[c('kupa', '2')], [c('maca', 'A'), c('maca', '3')], [c('karo', 'K')]],
      discard: [c('kupa', '9')],
    });
    const n = applyAction(s, { type: 'play', player: 0, cardId: 'kupa-2' });
    expect(n.phase).toBe('roundEnd');
    expect(n.roundResults[0]).toMatchObject({ winnerId: 0, jackFinish: false, scores: [0, 14, 10] });
    expect(n.players.map((p) => p.totalScore)).toEqual([0, 14, 10]);
    expect(n.players[1].roundScores).toEqual([14]);
  });

  it('en düşük toplam puan kazanır', () => {
    const s = makePlayingState({ hands: [[], [], []] });
    const players = s.players.map((p, i) => ({ ...p, totalScore: [30, 12, 40][i] }));
    expect(getWinners(players).map((p) => p.name)).toEqual(['P2']);
  });
});

describe('Vale ile bitirme', () => {
  it('son kart Vale ise rakiplerin puanı ikiye katlanır', () => {
    const s = makePlayingState({
      hands: [[c('kupa', 'J')], [c('maca', 'A'), c('maca', '3')], [c('karo', 'K')]],
      discard: [c('kupa', '9')],
    });
    const n = applyAction(s, { type: 'play', player: 0, cardId: 'kupa-J' });
    expect(n.roundResults[0]).toMatchObject({ jackFinish: true, scores: [0, 28, 20] });
  });

  it('Vale ile bitirmede renk seçimi açılmaz, tur hemen biter', () => {
    const s = makePlayingState({
      hands: [[c('kupa', 'J')], [c('maca', '3')]],
      discard: [c('kupa', '9')],
    });
    const n = applyAction(s, { type: 'play', player: 0, cardId: 'kupa-J' });
    expect(n.phase).toBe('roundEnd');
    expect(n.awaitingSuit).toBe(false);
    expect(n.chosenSuit).toBeNull();
    expect(n.roundResults[0].jackFinish).toBe(true);
  });

  it('Vale normal oynandığında ceza ya da puan etkisi yoktur', () => {
    const s = makePlayingState({
      hands: [[c('kupa', 'J'), c('kupa', '2')], [c('maca', '3')], [c('karo', 'K')]],
      discard: [c('kupa', '9')],
    });
    let n = applyAction(s, { type: 'play', player: 0, cardId: 'kupa-J' });
    n = applyAction(n, { type: 'chooseSuit', player: 0, suit: 'maca' });
    expect(n.phase).toBe('playing');
    expect(n.currentPlayer).toBe(1);
    expect(n.pendingPenalty).toBe(0);
  });
});
