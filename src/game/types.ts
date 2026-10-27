export type Suit = 'sinek' | 'kupa' | 'karo' | 'maca';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  /** Benzersiz kimlik, ör. "maca-7". Deste bütünlüğü bu kimlik üzerinden denetlenir. */
  id: string;
  suit: Suit;
  rank: Rank;
}

export interface Player {
  id: number;
  name: string;
  isHuman: boolean;
  hand: Card[];
  /** Her turun puanı (tur sırasıyla). */
  roundScores: number[];
  totalScore: number;
}

export type Phase = 'cut' | 'playing' | 'roundEnd' | 'gameOver';

/** Kesme aşamasında (deste kesildikten sonra, karar verilmeden önce) tutulan bilgi. */
export interface CutPreview {
  cutPosition: number;
  /** Kesen oyuncunun elinde kalan üst yarının alt kartı. */
  bottomCard: Card;
  /** Alt karttan yukarı doğru en fazla 7 kartlık "ilgili dizi" (index 0 = en alttaki kart). */
  sequence: Card[];
  eligible: boolean;
  /** Seçilebilecek kart sayıları (4–7, elde kalan yarının boyuyla sınırlı). */
  allowedCounts: number[];
}

export interface CutSummary {
  cutterId: number;
  cutPosition: number;
  bottomCard: Card;
  claimedCount: number;
  eligible: boolean;
}

export interface RoundResult {
  round: number;
  winnerId: number | null;
  jackFinish: boolean;
  blocked: boolean;
  /** Bu turda her oyuncuya eklenen puan (oyuncu sırasıyla). */
  scores: number[];
}

export interface LastMove {
  kind: 'play' | 'draw';
  player: number;
  /** Oynanan kart için 1, çekmede çekilen kart sayısı. */
  count: number;
  /** Hareketin oluştuğu durum sürümü; aynı hareketin iki kez canlandırılmasını önler. */
  version: number;
}

export interface GameEvent {
  kind: 'info' | 'penalty' | 'skip' | 'jack' | 'draw' | 'round' | 'suit' | 'oneCard';
  text: string;
  /** Olayın gösterileceği oyuncu paneli (yoksa null). */
  player?: number | null;
  /** Benzersiz olay numarası (durum sürümü). */
  id?: number;
}

/**
 * "Tek kart" bildirimi durumu:
 * - none: elde 1'den farklı sayıda kart var,
 * - open: elde 1 kart kaldı, bildirim bekleniyor (süre dolarsa +2 ceza),
 * - declared: oyuncu zamanında "TEK KART" dedi.
 */
export interface OneCardState {
  status: 'none' | 'open' | 'declared';
  /** Bu durumun başladığı sürüm; eski zamanlayıcıların yeni duruma ceza vermesini önler. */
  since: number;
}

export interface GameState {
  players: Player[];
  /** Kapalı deste; index 0 = en üstteki kart. */
  drawPile: Card[];
  /** Açık yığın; son eleman = en üstteki kart. */
  discardPile: Card[];
  currentPlayer: number;
  /** Biriken 7 cezası (kart sayısı). 0 ise ceza yok. */
  pendingPenalty: number;
  /** Vale ile seçilen ve bir sonraki kartın uyması gereken renk (yoksa null). */
  chosenSuit: Suit | null;
  /** Vale oynayan oyuncu renk seçimini bekliyor; bu sırada başka hamle yapılamaz. */
  awaitingSuit: boolean;
  /** Mevcut tur (0 tabanlı). */
  round: number;
  totalRounds: number;
  phase: Phase;
  cutterIndex: number;
  starterIndex: number;
  /** Kesme öncesi karılmış deste (yalnızca 'cut' aşamasında dolu). */
  shuffledDeck: Card[];
  cutPreview: CutPreview | null;
  lastCut: CutSummary | null;
  /** Oyuncu kart çektiyse ve çekilen kart oynanabiliyorsa bu kartın kimliği. */
  drawnCardId: string | null;
  /** Çekilecek kart kalmadığı için art arda pas geçen oyuncu sayısı (kilitlenme tespiti). */
  stalledPasses: number;
  roundResults: RoundResult[];
  /** Son kart hareketi (yalnızca arayüz animasyonu için; kurallara etkisi yok). */
  lastMove: LastMove | null;
  lastEvent: GameEvent | null;
  /** Son olaylar (panel bildirimleri için). */
  events: GameEvent[];
  /** Oyuncu başına tek kart bildirimi durumu. */
  oneCard: OneCardState[];
  log: string[];
  /** Her durum değişikliğinde artar; arayüz animasyonları için. */
  version: number;
}

export interface PlayerConfig {
  name: string;
  isHuman: boolean;
}
