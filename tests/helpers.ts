import { createGame } from '../src/game/engine';
import type { Card, GameState, Rank, Suit } from '../src/game/types';

export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function c(suit: Suit, rank: Rank): Card {
  return { id: `${suit}-${rank}`, suit, rank };
}

/** Kartları elle yerleştirilmiş, 'playing' aşamasında bir oyun durumu. */
export function makePlayingState(opts: {
  hands: Card[][];
  discard?: Card[];
  drawPile?: Card[];
  current?: number;
  pendingPenalty?: number;
}): GameState {
  const base = createGame(
    opts.hands.map((_, i) => ({ name: `P${i + 1}`, isHuman: i === 0 })),
    seeded(1),
  );
  return {
    ...base,
    phase: 'playing',
    shuffledDeck: [],
    players: base.players.map((p, i) => ({ ...p, hand: opts.hands[i] })),
    discardPile: opts.discard ?? [],
    drawPile: opts.drawPile ?? [],
    currentPlayer: opts.current ?? 0,
    pendingPenalty: opts.pendingPenalty ?? 0,
    // Elle kurulan tek kartlı eller "TEK KART" denmiş kabul edilir (bitiriş senaryoları için).
    oneCard: opts.hands.map((h) => ({ status: h.length === 1 ? ('declared' as const) : ('none' as const), since: 0 })),
  };
}

export function ids(cards: Card[]): string[] {
  return cards.map((x) => x.id).sort();
}
