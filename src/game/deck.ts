import type { Card, Rank, Suit } from './types';

export const SUITS: Suit[] = ['sinek', 'kupa', 'karo', 'maca'];
export const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export const SUIT_NAMES: Record<Suit, string> = {
  sinek: 'Sinek',
  kupa: 'Kupa',
  karo: 'Karo',
  maca: 'Maça',
};

export const SUIT_SYMBOLS: Record<Suit, string> = {
  sinek: '♣',
  kupa: '♥',
  karo: '♦',
  maca: '♠',
};

export const RANK_NAMES: Record<Rank, string> = {
  A: 'As',
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5',
  '6': '6',
  '7': '7',
  '8': '8',
  '9': '9',
  '10': '10',
  J: 'Vale',
  Q: 'Kız',
  K: 'Papaz',
};

export type Rng = () => number;

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ id: `${suit}-${rank}`, suit, rank });
    }
  }
  return deck;
}

/** Fisher–Yates karıştırma. Girdiyi değiştirmez. */
export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function cardLabel(card: Card): string {
  return `${SUIT_NAMES[card.suit]} ${RANK_NAMES[card.rank]}`;
}

export interface DrawResult {
  cards: Card[];
  drawPile: Card[];
  discardPile: Card[];
  reshuffled: boolean;
}

/**
 * Desteden en fazla `count` kart çeker. Deste biterse açık yığının üst kartı
 * dışındaki kartlar karıştırılıp yeni deste yapılır. Hiç kart kalmazsa
 * çekilebilen kadar kart döner (asla hata fırlatmaz, kart kopyalamaz/kaybetmez).
 */
export function drawFromPile(
  drawPile: readonly Card[],
  discardPile: readonly Card[],
  count: number,
  rng: Rng = Math.random,
): DrawResult {
  let pile = drawPile.slice();
  let discard = discardPile.slice();
  const cards: Card[] = [];
  let reshuffled = false;
  while (cards.length < count) {
    if (pile.length === 0) {
      if (discard.length <= 1) break;
      const top = discard[discard.length - 1];
      pile = shuffle(discard.slice(0, -1), rng);
      discard = [top];
      reshuffled = true;
    }
    cards.push(pile.shift()!);
  }
  return { cards, drawPile: pile, discardPile: discard, reshuffled };
}
