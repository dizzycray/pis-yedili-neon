import type { Card, GameState, Suit } from './types';

export const HAND_SIZE = 7;
export const TOTAL_ROUNDS = 4;
export const SEVEN_PENALTY = 4;

export function topCard(state: Pick<GameState, 'discardPile'>): Card | null {
  return state.discardPile.length ? state.discardPile[state.discardPile.length - 1] : null;
}

/** Açılış: açık yığın boşsa turun ilk kartı henüz oynanmamıştır ve Sinek olmalıdır. */
export function isOpening(state: Pick<GameState, 'discardPile'>): boolean {
  return state.discardPile.length === 0;
}

/**
 * Bir kartın oynanabilir olup olmadığı.
 * - Açılışta yalnızca Sinek.
 * - Bekleyen 7 cezası varsa yalnızca 7 ile karşılık verilebilir.
 * - Vale (J) her kartın üzerine atılabilir (ardından sembol seçilir).
 * - Vale ile renk seçildiyse: seçilen renk ya da başka bir Vale.
 * - Normalde üst kartla aynı renk (suit) ya da aynı değer (rank).
 */
export function isLegalPlay(
  card: Card,
  top: Card | null,
  pendingPenalty: number,
  chosenSuit: Suit | null = null,
): boolean {
  if (top === null) return card.suit === 'sinek';
  if (pendingPenalty > 0) return card.rank === '7';
  if (card.rank === 'J') return true;
  if (chosenSuit) return card.suit === chosenSuit || card.rank === top.rank;
  return card.suit === top.suit || card.rank === top.rank;
}

/** Oyuncunun o an oynayabileceği kartlar. Çekilen kart bekliyorsa yalnızca o kart. */
export function getLegalMoves(state: GameState, playerIndex: number): Card[] {
  if (state.phase !== 'playing' || state.currentPlayer !== playerIndex || state.awaitingSuit) return [];
  const hand = state.players[playerIndex].hand;
  const top = topCard(state);
  const candidates = state.drawnCardId ? hand.filter((c) => c.id === state.drawnCardId) : hand;
  return candidates.filter((c) => isLegalPlay(c, top, state.pendingPenalty, state.chosenSuit));
}

export function nextIndex(from: number, playerCount: number, steps = 1): number {
  return (from + steps) % playerCount;
}

/** Kesme hakkı her tur bir sonraki oyuncuya geçer. */
export function cutterForRound(round: number, playerCount: number): number {
  return round % playerCount;
}

/** Turu kesen oyuncunun solundaki (bir sonraki) oyuncu başlar. */
export function starterForRound(round: number, playerCount: number): number {
  return nextIndex(cutterForRound(round, playerCount), playerCount);
}
