import type { Suit } from '../game/types';

/** 100x100 kutuda çizilmiş renk sembolleri (emoji yerine vektör: her platformda aynı görünür). */
const PATHS: Record<Suit, string> = {
  kupa: 'M50 90 C22 68 5 51 5 31 C5 15 17 5 30 5 C40 5 46 11 50 19 C54 11 60 5 70 5 C83 5 95 15 95 31 C95 51 78 68 50 90Z',
  karo: 'M50 3 L86 50 L50 97 L14 50Z',
  maca: 'M50 4 C36 24 8 40 8 61 C8 75 19 83 31 83 C39 83 45 79 48 74 C47 84 43 91 35 97 L65 97 C57 91 53 84 52 74 C55 79 61 83 69 83 C81 83 92 75 92 61 C92 40 64 24 50 4Z',
  sinek:
    'M50 8 A19 19 0 1 1 49.9 8Z M27 40 A19 19 0 1 1 26.9 40Z M73 40 A19 19 0 1 1 72.9 40Z M44 50 L56 50 L56 60 C56 78 59 88 66 97 L34 97 C41 88 44 78 44 60Z',
};

interface Props {
  suit: Suit;
  x: number;
  y: number;
  size: number;
  fill?: string;
}

/** SVG içinde (x, y) sol üst köşesine `size` boyutunda sembol çizer. */
export function SuitIcon({ suit, x, y, size, fill = 'currentColor' }: Props) {
  return (
    <path
      d={PATHS[suit]}
      fill={fill}
      transform={`translate(${x} ${y}) scale(${size / 100})`}
    />
  );
}

/** Metin içinde kullanmak için bağımsız küçük sembol. */
export function SuitGlyph({ suit, size = 14 }: { suit: Suit; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden className="suit-glyph">
      <path d={PATHS[suit]} fill="currentColor" />
    </svg>
  );
}
