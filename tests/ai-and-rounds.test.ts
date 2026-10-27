import { describe, expect, it } from 'vitest';
import { buildAiView, chooseAction, chooseClaimCount, chooseCutPosition } from '../src/game/ai';
import { createDeck } from '../src/game/deck';
import { allCards, applyAction, createGame, type GameAction } from '../src/game/engine';
import { getLegalMoves } from '../src/game/rules';
import type { GameState } from '../src/game/types';
import { c, ids, makePlayingState, seeded } from './helpers';

/** Tüm oyunu yapay zekâyla oynatır; her adımda hamle yasallığı ve deste bütünlüğü denetlenir. */
function playFullGame(seed: number, players: number): { state: GameState; steps: number } {
  const rng = seeded(seed);
  let g = createGame(
    Array.from({ length: players }, (_, i) => ({ name: `AI${i}`, isHuman: false })),
    rng,
  );
  let steps = 0;
  const fullDeck = ids(createDeck());
  while (g.phase !== 'gameOver') {
    let action: GameAction;
    if (g.phase === 'cut') {
      action = g.cutPreview
        ? { type: 'claim', count: chooseClaimCount(g.cutPreview) }
        : { type: 'cut', position: chooseCutPosition(rng) };
    } else if (g.phase === 'roundEnd') {
      action = { type: 'nextRound' };
    } else {
      action = chooseAction(g, g.currentPlayer);
      if (action.type === 'play') {
        const legal = getLegalMoves(g, g.currentPlayer).map((x) => x.id);
        expect(legal).toContain(action.cardId);
      }
    }
    g = applyAction(g, action, rng); // Yasadışı hamle hata fırlatırdı.
    expect(ids(allCards(g))).toEqual(fullDeck);
    if (++steps > 20000) throw new Error('Oyun bitmedi');
  }
  return { state: g, steps };
}

describe('yapay zekâ', () => {
  it('birçok tam oyunda yalnızca yasal hamle yapar ve oyun 4 turda biter', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const { state } = playFullGame(seed, 2 + (seed % 3));
      expect(state.roundResults).toHaveLength(4);
      for (const p of state.players) {
        expect(p.roundScores).toHaveLength(4);
        expect(p.totalScore).toBe(p.roundScores.reduce((a, b) => a + b, 0));
      }
    }
  });

  it('rakip kartlarını görmez: görünümde yalnızca kart sayıları vardır', () => {
    const s = makePlayingState({
      hands: [[c('kupa', '2')], [c('maca', '3'), c('maca', '4')]],
      discard: [c('kupa', '9')],
    });
    const view = buildAiView(s, 0);
    expect(view.hand.map((x) => x.id)).toEqual(['kupa-2']);
    expect(view.handCounts).toEqual([1, 2]);
    expect(JSON.stringify(view)).not.toContain('maca-3');
  });

  it('ceza varken 7 ile karşılık verir, yoksa cezayı alır', () => {
    const s = makePlayingState({
      hands: [[c('kupa', '2')], [c('maca', '7'), c('maca', '4')]],
      discard: [c('kupa', '7')],
      current: 1,
      pendingPenalty: 4,
    });
    expect(chooseAction(s, 1)).toEqual({ type: 'play', player: 1, cardId: 'maca-7' });
    const s2 = { ...s, players: s.players.map((p, i) => (i === 1 ? { ...p, hand: [c('maca', '4')] } : p)) };
    expect(chooseAction(s2, 1)).toEqual({ type: 'acceptPenalty', player: 1 });
  });

  it('oynanacak kart yoksa çeker; son iki kartta Valeyi bitiş için saklar', () => {
    const s = makePlayingState({
      hands: [[c('maca', '2')], [c('karo', '4')]],
      discard: [c('kupa', '9')],
      drawPile: [c('karo', 'K')],
    });
    expect(chooseAction(s, 0)).toEqual({ type: 'draw', player: 0 });
    const j = makePlayingState({
      hands: [[c('kupa', 'J'), c('kupa', '3')], [c('karo', '4'), c('karo', '5'), c('karo', '6')]],
      discard: [c('kupa', '9')],
    });
    expect(chooseAction(j, 0)).toEqual({ type: 'play', player: 0, cardId: 'kupa-3' });
  });
});

describe('tur tamamlama', () => {
  it('çekecek kart kalmayınca ve kimse oynayamayınca tur kilitlenip puanlanır', () => {
    const s = makePlayingState({
      hands: [[c('maca', '2')], [c('karo', '4')]],
      discard: [c('kupa', '9')],
    });
    let n = applyAction(s, { type: 'draw', player: 0 });
    expect(n.phase).toBe('playing');
    n = applyAction(n, { type: 'draw', player: 1 });
    expect(n.phase).toBe('roundEnd');
    expect(n.roundResults[0]).toMatchObject({ winnerId: null, blocked: true, scores: [2, 4] });
  });

  it('tur bitince sonraki tur yeni 52 kartlık desteyle başlar', () => {
    const s = makePlayingState({
      hands: [[c('kupa', '2')], [c('karo', '4')]],
      discard: [c('kupa', '9')],
    });
    let n = applyAction(s, { type: 'play', player: 0, cardId: 'kupa-2' });
    n = applyAction(n, { type: 'nextRound' });
    expect(n.phase).toBe('cut');
    expect(n.round).toBe(1);
    expect(n.cutterIndex).toBe(1);
    expect(n.shuffledDeck).toHaveLength(52);
    expect(n.players.every((p) => p.hand.length === 0)).toBe(true);
    expect(n.players[1].totalScore).toBe(4);
  });
});
