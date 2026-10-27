import type { Rng } from './deck';
import { MAX_CUT, MIN_CUT, SPECIAL_CUT_RANKS } from './deckCut';
import type { GameAction } from './engine';
import { SUITS } from './deck';
import { getLegalMoves, isOpening, nextIndex, topCard } from './rules';
import { cardValue } from './scoring';
import type { Card, CutPreview, GameState, Suit } from './types';

/*
 * Yapay zekâ yalnızca "açık" bilgiyi kullanır: kendi eli, açık yığının üst kartı,
 * bekleyen ceza ve rakiplerin KART SAYILARI. Rakiplerin kartlarına asla bakmaz.
 * Bu yüzden karar fonksiyonlarına tüm durum yerine bir AiView verilir.
 */
export interface AiView {
  hand: Card[];
  top: Card | null;
  pendingPenalty: number;
  chosenSuit: Suit | null;
  awaitingSuit: boolean;
  drawnCardId: string | null;
  opening: boolean;
  /** Oyuncu sırasıyla rakiplerin elindeki kart sayıları. */
  handCounts: number[];
  self: number;
  legal: Card[];
}

export function buildAiView(state: GameState, player: number): AiView {
  return {
    hand: state.players[player].hand.slice(),
    top: topCard(state),
    pendingPenalty: state.pendingPenalty,
    chosenSuit: state.chosenSuit,
    awaitingSuit: state.awaitingSuit,
    drawnCardId: state.drawnCardId,
    opening: isOpening(state),
    handCounts: state.players.map((p) => p.hand.length),
    self: player,
    legal: getLegalMoves(state, player),
  };
}

function suitCounts(hand: Card[]): Record<Suit, number> {
  const counts: Record<Suit, number> = { sinek: 0, kupa: 0, karo: 0, maca: 0 };
  for (const c of hand) counts[c.suit]++;
  return counts;
}

/** Bir kartı oynamanın basit stratejik puanı (yüksek = daha iyi). */
function scoreMove(card: Card, view: AiView): number {
  const rest = view.hand.filter((c) => c.id !== card.id);
  const counts = suitCounts(rest);
  const n = view.handCounts.length;
  const nextCount = view.handCounts[nextIndex(view.self, n)];
  let score = cardValue(card); // Yüksek puanlı kartlardan erken kurtul.
  score += counts[card.suit] * 2; // Elde devam ettirebileceğimiz renge geç.

  // Elde tek kart kalacaksa ve o kart Vale ise, Vale bitişi için onu sakla.
  if (rest.length === 1 && rest[0].rank === 'J') score += 25;
  // Son kart Vale ise doğrudan bitir (zaten tek seçenek), değilse Valeyi erken harcama.
  if (card.rank === 'J' && rest.length > 0) score -= 8;

  if (card.rank === '7' || card.rank === 'A') {
    // Saldırı kartlarını, sıradaki rakip bitirmeye yakınsa kullan; yoksa biraz sakla.
    score += nextCount <= 2 ? 30 : -6;
  }
  if (rest.length === 0) score += 1000; // Bitiren hamle her zaman en iyisi.
  return score;
}

/**
 * Vale sonrası renk seçimi: elde en çok kartı olan renk (o renge geçince en çok kart
 * oynanabilir). Eşitlikte toplam puanı yüksek olan renk seçilir ki yüksek kartlardan
 * erken kurtulunsun. Valeler her renkte oynanabildiği için sayıma katılmaz.
 */
export function chooseSuitFor(hand: Card[]): Suit {
  let best: Suit = 'sinek';
  let bestKey = [-1, -1];
  for (const suit of SUITS) {
    const cards = hand.filter((c) => c.suit === suit && c.rank !== 'J');
    const key = [cards.length, cards.reduce((s, c) => s + cardValue(c), 0)];
    if (key[0] > bestKey[0] || (key[0] === bestKey[0] && key[1] > bestKey[1])) {
      best = suit;
      bestKey = key;
    }
  }
  return best;
}

export function choosePlay(view: AiView): Card | null {
  if (view.legal.length === 0) return null;
  return view.legal.reduce((best, c) => (scoreMove(c, view) > scoreMove(best, view) ? c : best));
}

/** Sıradaki AI oyuncusunun yapacağı hamle. Her zaman kurallara uygun bir eylem döner. */
export function chooseAction(state: GameState, player: number): GameAction {
  const view = buildAiView(state, player);
  // Son kartı atmadan önce "TEK KART" bildirimi şarttır.
  if (state.oneCard[player]?.status === 'open') return { type: 'declareOneCard', player };
  if (view.awaitingSuit) return { type: 'chooseSuit', player, suit: chooseSuitFor(view.hand) };
  if (view.pendingPenalty > 0) {
    // 7 ile karşılık vermek cezayı bir sonrakine aktarır; her zaman tercih edilir.
    const seven = view.legal.find((c) => c.rank === '7');
    return seven ? { type: 'play', player, cardId: seven.id } : { type: 'acceptPenalty', player };
  }
  if (view.drawnCardId) {
    const drawn = view.legal[0];
    return drawn ? { type: 'play', player, cardId: drawn.id } : { type: 'pass', player };
  }
  const pick = choosePlay(view);
  if (pick) return { type: 'play', player, cardId: pick.id };
  return { type: 'draw', player };
}

export function chooseCutPosition(rng: Rng = Math.random): number {
  return MIN_CUT + Math.floor(rng() * (MAX_CUT - MIN_CUT + 1));
}

/** Kesmede alınacak kart sayısı: en çok özel kartı içeren en kısa blok; yoksa almaz. */
export function chooseClaimCount(preview: CutPreview): number | null {
  if (!preview.eligible) return null;
  let best: number | null = null;
  let bestScore = -Infinity;
  for (const k of preview.allowedCounts) {
    const block = preview.sequence.slice(0, k);
    const specials = block.filter((c) => SPECIAL_CUT_RANKS.includes(c.rank)).length;
    if (specials === 0) continue;
    // Özel kart başına ödül, düşük puanlı kart da elde tutmaya değer; çok yüksek puan cezalandırılır.
    const score = specials * 20 - block.reduce((s, c) => s + cardValue(c), 0) / 4;
    if (score > bestScore) {
      bestScore = score;
      best = k;
    }
  }
  return best;
}
