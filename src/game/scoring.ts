import type { Card, Player } from './types';

/** A=11, 2–9 yüz değeri, 10/J/Q/K=10. */
export function cardValue(card: Card): number {
  switch (card.rank) {
    case 'A':
      return 11;
    case '10':
    case 'J':
    case 'Q':
    case 'K':
      return 10;
    default:
      return Number(card.rank);
  }
}

export function handValue(hand: readonly Card[]): number {
  return hand.reduce((sum, c) => sum + cardValue(c), 0);
}

/**
 * Tur puanları. Kazanan 0 alır, diğerleri elindeki kartların toplamını.
 * Tur Vale (J) ile bitirildiyse rakiplerin puanı ikiye katlanır.
 * Kilitlenen turda (winnerId=null) herkes eldeki puanını alır.
 */
export function computeRoundScores(
  players: readonly Player[],
  winnerId: number | null,
  jackFinish: boolean,
): number[] {
  return players.map((p) => {
    if (p.id === winnerId) return 0;
    const base = handValue(p.hand);
    return jackFinish && winnerId !== null ? base * 2 : base;
  });
}

/** En düşük toplam puan kazanır; eşitlikte birden fazla kazanan dönebilir. */
export function getWinners(players: readonly Player[]): Player[] {
  const min = Math.min(...players.map((p) => p.totalScore));
  return players.filter((p) => p.totalScore === min);
}
