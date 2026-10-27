import { RANK_NAMES, SUIT_NAMES } from '../game/deck';
import type { Card, Rank, Suit } from '../game/types';
import { SuitIcon } from './SuitIcon';

/* Kart yüzü 100x140 birimlik bir SVG'dir; her boyutta keskin ve okunaklı kalır. */

const INK_RED = '#c3142d';
const INK_BLACK = '#17151c';

/** Yalnızca küçük, baskı görünümlü bir hatırlatma; parıltı yok. */
const SPECIAL_LABELS: Partial<Record<Rank, string>> = {
  '7': 'CEZA +4',
  A: 'SIRA ATLAT',
};

const COURT_TINT: Record<'J' | 'Q' | 'K', string> = {
  K: '#f2e2b3',
  Q: '#f3d5dc',
  J: '#d7e3f3',
};

/** Vale, Kız ve Papaz için başlık süslemeleri (üst yarı; alt yarı aynalanır). */
function CourtCrown({ rank }: { rank: 'J' | 'Q' | 'K' }) {
  if (rank === 'K') {
    return (
      <g>
        <path d="M37 47 L39 33 L44.5 40 L50 30 L55.5 40 L61 33 L63 47 Z" fill="#d4a62a" stroke="currentColor" strokeWidth="1" />
        <circle cx="50" cy="29" r="2" fill="currentColor" />
        <circle cx="39" cy="32" r="1.6" fill="currentColor" />
        <circle cx="61" cy="32" r="1.6" fill="currentColor" />
      </g>
    );
  }
  if (rank === 'Q') {
    return (
      <g>
        <path d="M38 47 Q50 27 62 47 Z" fill="#d4a62a" stroke="currentColor" strokeWidth="1" />
        <circle cx="50" cy="34" r="2.2" fill="currentColor" />
        <circle cx="43" cy="40" r="1.4" fill="currentColor" />
        <circle cx="57" cy="40" r="1.4" fill="currentColor" />
      </g>
    );
  }
  return (
    <g>
      <path d="M39 47 L61 47 L58 38 Q50 31 42 38 Z" fill="#3c5fa8" stroke="currentColor" strokeWidth="1" />
      <path d="M57 38 Q67 30 64 22" fill="none" stroke="#d4a62a" strokeWidth="2.2" strokeLinecap="round" />
    </g>
  );
}

function CourtHalf({ rank, suit }: { rank: 'J' | 'Q' | 'K'; suit: Suit }) {
  return (
    <g>
      <CourtCrown rank={rank} />
      <text x="50" y="66" textAnchor="middle" className="court-letter">
        {rank}
      </text>
      <SuitIcon suit={suit} x={25} y={27} size={11} />
    </g>
  );
}

function Corner({ rank, suit }: { rank: Rank; suit: Suit }) {
  return (
    <g>
      <text x="11" y="23" textAnchor="middle" className={`corner-rank ${rank === '10' ? 'ten' : ''}`}>
        {rank}
      </text>
      <SuitIcon suit={suit} x={4.5} y={27} size={13} />
    </g>
  );
}

function CardFace({ card }: { card: Card }) {
  const ink = card.suit === 'kupa' || card.suit === 'karo' ? INK_RED : INK_BLACK;
  const court = card.rank === 'J' || card.rank === 'Q' || card.rank === 'K' ? card.rank : null;
  const label = SPECIAL_LABELS[card.rank];
  return (
    <svg viewBox="0 0 100 140" className="card-svg" style={{ color: ink }} aria-hidden>
      <Corner rank={card.rank} suit={card.suit} />
      <g transform="rotate(180 50 70)">
        <Corner rank={card.rank} suit={card.suit} />
      </g>
      {court ? (
        <g>
          <rect x="22" y="24" width="56" height="92" rx="3" fill={COURT_TINT[court]} stroke="currentColor" strokeWidth="1.3" />
          <line x1="22" y1="70" x2="78" y2="70" stroke="currentColor" strokeWidth="0.8" opacity="0.6" />
          <CourtHalf rank={court} suit={card.suit} />
          <g transform="rotate(180 50 70)">
            <CourtHalf rank={court} suit={card.suit} />
          </g>
        </g>
      ) : card.rank === 'A' ? (
        <g>
          <circle cx="50" cy="68" r="31" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.35" />
          <SuitIcon suit={card.suit} x={23} y={41} size={54} />
        </g>
      ) : (
        <SuitIcon suit={card.suit} x={27} y={45} size={46} />
      )}
      {label && (
        <text x="50" y="125" textAnchor="middle" className="special-print">
          {label}
        </text>
      )}
    </svg>
  );
}

function CardBack() {
  return (
    <svg viewBox="0 0 100 140" className="card-svg" aria-hidden>
      <rect x="5" y="5" width="90" height="130" rx="6" fill="none" stroke="#b026ff" strokeWidth="1.4" />
      <rect x="9" y="9" width="82" height="122" rx="4" fill="none" stroke="#00e5f2" strokeWidth="0.6" opacity="0.7" />
      <g fill="none" strokeWidth="1.2">
        <path d="M50 30 L80 70 L50 110 L20 70 Z" stroke="#b026ff" />
        <path d="M50 42 L71 70 L50 98 L29 70 Z" stroke="#00e5f2" />
        <path d="M50 54 L62 70 L50 86 L38 70 Z" stroke="#ff2bd6" />
        <path d="M50 9 L50 30 M50 110 L50 131 M9 70 L20 70 M80 70 L91 70" stroke="#b026ff" opacity="0.7" />
      </g>
      <circle cx="50" cy="70" r="4" fill="#00e5f2" />
      {[
        [17, 17],
        [83, 17],
        [17, 123],
        [83, 123],
      ].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3" fill="none" stroke="#00e5f2" strokeWidth="1" />
      ))}
    </svg>
  );
}

interface Props {
  card?: Card;
  faceDown?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  playable?: boolean;
  dimmed?: boolean;
  highlight?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
  className?: string;
}

export function CardView({
  card,
  faceDown,
  size = 'md',
  playable,
  dimmed,
  highlight,
  onClick,
  style,
  className = '',
}: Props) {
  if (faceDown || !card) {
    return (
      <div className={`card card-${size} card-back ${className}`} style={style} aria-label="Kapalı kart">
        <CardBack />
      </div>
    );
  }
  const label = `${SUIT_NAMES[card.suit]} ${RANK_NAMES[card.rank]}`;
  const classes = [
    'card',
    `card-${size}`,
    'card-face',
    playable ? 'playable' : '',
    dimmed ? 'dimmed' : '',
    highlight ? 'highlight' : '',
    onClick ? 'clickable' : '',
    className,
  ].join(' ');

  return onClick ? (
    <button
      type="button"
      className={classes}
      style={style}
      onClick={onClick}
      disabled={!playable}
      aria-label={playable ? `${label} oyna` : label}
      title={label}
    >
      <CardFace card={card} />
    </button>
  ) : (
    <div className={classes} style={style} aria-label={label} title={label}>
      <CardFace card={card} />
    </div>
  );
}
