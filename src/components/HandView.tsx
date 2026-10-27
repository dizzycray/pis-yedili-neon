import { RANKS, SUITS } from '../game/deck';
import type { Card } from '../game/types';
import { CardView } from './CardView';

interface Props {
  hand: Card[];
  legalIds: Set<string>;
  drawnCardId: string | null;
  isTurn: boolean;
  onPlay: (cardId: string) => void;
}

function sortHand(hand: Card[]): Card[] {
  return hand
    .slice()
    .sort((a, b) => SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit) || RANKS.indexOf(a.rank) - RANKS.indexOf(b.rank));
}

/** Oyuncunun eli: hafif yay şeklinde açılmış bir yelpaze. Sol üst köşe her zaman görünür kalır. */
export function HandView({ hand, legalIds, drawnCardId, isTurn, onPlay }: Props) {
  const cards = sortHand(hand);
  const n = cards.length;
  // Kart sayısı arttıkça kartlar daha çok üst üste biner ve yay düzleşir.
  const overlap = n > 16 ? 'xtight' : n > 12 ? 'tight' : n > 8 ? 'medium' : 'loose';
  const spread = n > 10 ? 1.2 : 2.4;
  return (
    <div className={`hand hand-${overlap}`} aria-label="Elin">
      {cards.map((card, i) => {
        const playable = isTurn && legalIds.has(card.id);
        const offset = i - (n - 1) / 2;
        return (
          <CardView
            key={card.id}
            card={card}
            size="lg"
            playable={playable}
            dimmed={isTurn && !playable}
            highlight={card.id === drawnCardId}
            onClick={() => onPlay(card.id)}
            className="hand-card"
            style={{
              ['--rot' as string]: `${offset * spread}deg`,
              ['--arc' as string]: `${Math.min(offset * offset * 0.6, 16)}px`,
              zIndex: i + 1,
            }}
          />
        );
      })}
    </div>
  );
}
