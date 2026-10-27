import { chooseSuitFor } from './ai';
import { SUIT_NAMES, cardLabel, createDeck, drawFromPile, shuffle, type Rng } from './deck';
import { resolveDeckCut, previewDeckCut } from './deckCut';
import {
  HAND_SIZE,
  SEVEN_PENALTY,
  TOTAL_ROUNDS,
  cutterForRound,
  getLegalMoves,
  isLegalPlay,
  isOpening,
  nextIndex,
  starterForRound,
  topCard,
} from './rules';
import { computeRoundScores } from './scoring';
import type { Card, GameEvent, GameState, Player, PlayerConfig, Suit } from './types';

export type GameAction =
  | { type: 'cut'; position: number }
  | { type: 'claim'; count: number | null }
  | { type: 'play'; player: number; cardId: string }
  | { type: 'draw'; player: number }
  | { type: 'acceptPenalty'; player: number }
  | { type: 'pass'; player: number }
  | { type: 'chooseSuit'; player: number; suit: Suit }
  | { type: 'timeout'; player: number }
  | { type: 'declareOneCard'; player: number }
  | { type: 'oneCardPenalty'; player: number; since: number }
  | { type: 'nextRound' };

export class IllegalActionError extends Error {}

function fail(msg: string): never {
  throw new IllegalActionError(msg);
}

const MAX_LOG = 60;
const MAX_EVENTS = 30;
export const ONE_CARD_PENALTY = 2;

function withLog(state: GameState, text: string, event?: GameEvent): GameState {
  const ev: GameEvent = { ...(event ?? { kind: 'info', text }), player: event?.player ?? null, id: state.version + 1 };
  return {
    ...state,
    log: [...state.log, text].slice(-MAX_LOG),
    lastEvent: ev,
    events: [...state.events, ev].slice(-MAX_EVENTS),
    version: state.version + 1,
  };
}

/**
 * Tek kart durumlarını ellere göre günceller: elde tam 1 kart kalan oyuncu için
 * bildirim penceresi açılır; kart sayısı değişince (oynayıp bitirme, ceza, çekme)
 * pencere kapanır. Böylece son kartını atıp turu bitiren oyuncuya ceza uygulanamaz.
 */
function syncOneCard(state: GameState): GameState {
  let changed = false;
  const oneCard = state.players.map((p, i) => {
    const prev = state.oneCard[i] ?? { status: 'none' as const, since: 0 };
    const shouldTrack = state.phase === 'playing' && p.hand.length === 1;
    if (!shouldTrack) {
      if (prev.status === 'none') return prev;
      changed = true;
      return { status: 'none' as const, since: state.version };
    }
    if (prev.status !== 'none') return prev;
    changed = true;
    return { status: 'open' as const, since: state.version };
  });
  return changed ? { ...state, oneCard } : state;
}

function setHand(players: Player[], index: number, hand: Card[]): Player[] {
  return players.map((p, i) => (i === index ? { ...p, hand } : p));
}

function withMove(state: GameState, kind: 'play' | 'draw', player: number, count: number): GameState {
  return count > 0 ? { ...state, lastMove: { kind, player, count, version: state.version + 1 } } : state;
}

export function createGame(configs: PlayerConfig[], rng: Rng = Math.random): GameState {
  if (configs.length < 2 || configs.length > 4) fail('Oyuncu sayısı 2 ile 4 arasında olmalı.');
  const players: Player[] = configs.map((c, i) => ({
    id: i,
    name: c.name.trim() || `Oyuncu ${i + 1}`,
    isHuman: c.isHuman,
    hand: [],
    roundScores: [],
    totalScore: 0,
  }));
  return beginRound(
    {
      players,
      drawPile: [],
      discardPile: [],
      currentPlayer: 0,
      pendingPenalty: 0,
      chosenSuit: null,
      awaitingSuit: false,
      round: 0,
      totalRounds: TOTAL_ROUNDS,
      phase: 'cut',
      cutterIndex: 0,
      starterIndex: 0,
      shuffledDeck: [],
      cutPreview: null,
      lastCut: null,
      drawnCardId: null,
      stalledPasses: 0,
      roundResults: [],
      lastMove: null,
      lastEvent: null,
      events: [],
      oneCard: configs.map(() => ({ status: 'none' as const, since: 0 })),
      log: [],
      version: 0,
    },
    0,
    rng,
  );
}

function beginRound(state: GameState, round: number, rng: Rng): GameState {
  const n = state.players.length;
  const cutterIndex = cutterForRound(round, n);
  const next: GameState = {
    ...state,
    players: state.players.map((p) => ({ ...p, hand: [] })),
    drawPile: [],
    discardPile: [],
    pendingPenalty: 0,
    chosenSuit: null,
    awaitingSuit: false,
    round,
    phase: 'cut',
    cutterIndex,
    starterIndex: starterForRound(round, n),
    currentPlayer: cutterIndex,
    shuffledDeck: shuffle(createDeck(), rng),
    cutPreview: null,
    lastCut: null,
    drawnCardId: null,
    stalledPasses: 0,
    lastMove: null,
  };
  return withLog(
    next,
    `${round + 1}. tur başladı. Desteyi ${state.players[cutterIndex].name} kesiyor.`,
    { kind: 'round', text: `${round + 1}. TUR` },
  );
}

function cut(state: GameState, position: number): GameState {
  if (state.phase !== 'cut' || state.cutPreview) fail('Şu an deste kesilemez.');
  const preview = previewDeckCut(state.shuffledDeck, position);
  return withLog(
    { ...state, cutPreview: preview },
    `${state.players[state.cutterIndex].name} desteyi ${position}. karttan kesti ve alt karta baktı.`,
  );
}

function claim(state: GameState, count: number | null): GameState {
  if (state.phase !== 'cut' || !state.cutPreview) fail('Önce deste kesilmeli.');
  const { claimed, deck, preview } = resolveDeckCut(
    state.shuffledDeck,
    state.cutPreview.cutPosition,
    count,
  );
  const n = state.players.length;
  const hands: Card[][] = state.players.map(() => []);
  hands[state.cutterIndex] = claimed.slice();
  // Normal dağıtım: başlayan oyuncudan itibaren birer birer, eli 7 olana kadar.
  let pile = deck;
  let i = state.starterIndex;
  while (hands.some((h) => h.length < HAND_SIZE)) {
    if (hands[i].length < HAND_SIZE) {
      hands[i].push(pile[0]);
      pile = pile.slice(1);
    }
    i = nextIndex(i, n);
  }
  const cutter = state.players[state.cutterIndex].name;
  const msg = claimed.length
    ? `${cutter} kesmeden ${claimed.length} ardışık kart aldı. Eller 7 karta tamamlandı.`
    : preview.eligible
      ? `${cutter} kart almamayı seçti. Kartlar dağıtıldı.`
      : `Dizide özel kart (J, A, 7) yok. Kartlar normal dağıtıldı.`;
  const next: GameState = {
    ...state,
    players: state.players.map((p, idx) => ({ ...p, hand: hands[idx] })),
    drawPile: pile,
    discardPile: [],
    shuffledDeck: [],
    phase: 'playing',
    currentPlayer: state.starterIndex,
    cutPreview: null,
    lastCut: {
      cutterId: state.cutterIndex,
      cutPosition: preview.cutPosition,
      bottomCard: preview.bottomCard,
      claimedCount: claimed.length,
      eligible: preview.eligible,
    },
  };
  return withLog(
    withLog(next, msg),
    `${state.players[state.starterIndex].name} Sinek ile başlamalı.`,
  );
}

function assertTurn(state: GameState, player: number, allowSuitChoice = false) {
  if (state.phase !== 'playing') fail('Tur oynanmıyor.');
  if (state.currentPlayer !== player) fail('Sıra bu oyuncuda değil.');
  if (state.awaitingSuit && !allowSuitChoice) fail('Önce Vale için bir renk seçilmeli.');
}

function advance(state: GameState, steps = 1): GameState {
  return {
    ...state,
    currentPlayer: nextIndex(state.currentPlayer, state.players.length, steps),
    drawnCardId: null,
  };
}

function endRound(state: GameState, winnerId: number | null, jackFinish: boolean): GameState {
  const scores = computeRoundScores(state.players, winnerId, jackFinish);
  const players = state.players.map((p, i) => ({
    ...p,
    roundScores: [...p.roundScores, scores[i]],
    totalScore: p.totalScore + scores[i],
  }));
  const result = { round: state.round, winnerId, jackFinish, blocked: winnerId === null, scores };
  const text =
    winnerId === null
      ? 'Çekilecek kart kalmadı ve kimse oynayamıyor: tur kilitlendi.'
      : jackFinish
        ? `${state.players[winnerId].name} turu VALE ile bitirdi! Rakiplerin puanı ikiye katlandı.`
        : `${state.players[winnerId].name} elini bitirdi ve turu kazandı.`;
  return withLog(
    {
      ...state,
      players,
      phase: 'roundEnd',
      pendingPenalty: 0,
      chosenSuit: null,
      awaitingSuit: false,
      drawnCardId: null,
      roundResults: [...state.roundResults, result],
    },
    text,
    {
      kind: jackFinish ? 'jack' : 'round',
      text: winnerId === null ? 'TUR KİLİTLENDİ' : jackFinish ? 'VALE İLE BİTİRDİ ×2' : 'ELİNİ BİTİRDİ',
      player: winnerId,
    },
  );
}

function play(state: GameState, player: number, cardId: string, rng: Rng): GameState {
  assertTurn(state, player);
  const p = state.players[player];
  const card = p.hand.find((c) => c.id === cardId);
  if (!card) fail('Kart elde değil.');
  if (state.drawnCardId && state.drawnCardId !== cardId) fail('Yalnızca çekilen kart oynanabilir.');
  if (!isLegalPlay(card, topCard(state), state.pendingPenalty, state.chosenSuit)) fail('Bu kart oynanamaz.');

  // Son kart ancak "TEK KART" dendikten sonra atılabilir. Denmediyse kart atılmaz,
  // oyuncu +2 ceza çeker ve sırası normal kurallarla devam eder.
  if (p.hand.length === 1 && state.oneCard[player]?.status !== 'declared') {
    return applyOneCardPenalty(state, player, rng, 'son kartı TEK KART demeden atmaya çalıştı');
  }

  const hand = p.hand.filter((c) => c.id !== cardId);
  let next: GameState = withMove(
    {
      ...state,
      players: setHand(state.players, player, hand),
      discardPile: [...state.discardPile, card],
      stalledPasses: 0,
      drawnCardId: null,
      chosenSuit: null,
    },
    'play',
    player,
    1,
  );
  next = withLog(next, `${p.name}: ${cardLabel(card)} oynadı.`);
  // Son kart Vale ise tur hemen biter (renk seçimi yok, rakip puanları ×2).
  if (hand.length === 0) return endRound(next, player, card.rank === 'J');

  if (card.rank === 'J') {
    return withLog({ ...next, awaitingSuit: true }, `${p.name} Vale attı ve renk seçiyor.`);
  }

  const n = state.players.length;
  if (card.rank === '7') {
    const penalty = state.pendingPenalty + SEVEN_PENALTY;
    next = advance({ ...next, pendingPenalty: penalty });
    const victim = next.players[next.currentPlayer].name;
    return withLog(next, `${victim} için ${penalty} kart ceza birikti!`, {
      kind: 'penalty',
      text: `+${penalty} CEZA BEKLİYOR`,
      player: next.currentPlayer,
    });
  }
  if (card.rank === 'A') {
    const skippedId = nextIndex(player, n);
    const skipped = next.players[skippedId].name;
    next = advance(next, 2);
    return withLog(next, `As! ${skipped} sırasını kaybetti.`, {
      kind: 'skip',
      text: 'SIRA ATLANDI',
      player: skippedId,
    });
  }
  return advance(next);
}

function draw(state: GameState, player: number, rng: Rng): GameState {
  assertTurn(state, player);
  if (state.pendingPenalty > 0) fail('Ceza varken kart çekilemez; 7 oyna ya da cezayı al.');
  if (state.drawnCardId) fail('Zaten kart çektin.');
  const p = state.players[player];
  const n = state.players.length;

  if (isOpening(state)) {
    if (p.hand.some((c) => c.suit === 'sinek')) fail('Elinde Sinek var; onunla başlamalısın.');
    // Sinek bulunana kadar kart çekilir.
    let pile = state.drawPile;
    const drawn: Card[] = [];
    while (pile.length && !drawn.some((c) => c.suit === 'sinek')) {
      drawn.push(pile[0]);
      pile = pile.slice(1);
    }
    let next: GameState = withMove(
      {
        ...state,
        drawPile: pile,
        players: setHand(state.players, player, [...p.hand, ...drawn]),
      },
      'draw',
      player,
      drawn.length,
    );
    if (drawn.some((c) => c.suit === 'sinek')) {
      return withLog(next, `${p.name} Sinek bulana kadar ${drawn.length} kart çekti.`, {
        kind: 'draw',
        text: `+${drawn.length} KART (SİNEK ARANDI)`,
        player,
      });
    }
    next = advance(next);
    return withLog(
      next,
      `${p.name} Sinek bulamadı, deste bitti. Açılış hakkı ${next.players[next.currentPlayer].name} oyuncusuna geçti.`,
    );
  }

  if (getLegalMoves(state, player).length > 0) fail('Oynanabilir kartın var; çekemezsin.');
  const res = drawFromPile(state.drawPile, state.discardPile, 1, rng);
  let next: GameState = { ...state, drawPile: res.drawPile, discardPile: res.discardPile };
  if (res.reshuffled) next = withLog(next, 'Deste bitti; açık yığın karıştırılıp yeni deste yapıldı.');
  if (res.cards.length === 0) {
    const stalled = state.stalledPasses + 1;
    next = advance({ ...next, stalledPasses: stalled });
    next = withLog(next, `${p.name} çekecek kart bulamadı ve pas geçti.`);
    return stalled >= n ? endRound(next, null, false) : next;
  }
  const card = res.cards[0];
  next = withMove(
    { ...next, players: setHand(next.players, player, [...p.hand, card]), stalledPasses: 0 },
    'draw',
    player,
    1,
  );
  if (isLegalPlay(card, topCard(next), 0, next.chosenSuit)) {
    return withLog({ ...next, drawnCardId: card.id }, `${p.name} bir kart çekti.`, {
      kind: 'draw',
      text: '+1 KART ÇEKİLDİ',
      player,
    });
  }
  return withLog(advance(next), `${p.name} bir kart çekti ve sırayı geçti.`, {
    kind: 'draw',
    text: '+1 KART ÇEKİLDİ',
    player,
  });
}

function acceptPenalty(state: GameState, player: number, rng: Rng): GameState {
  assertTurn(state, player);
  if (state.pendingPenalty <= 0) fail('Bekleyen ceza yok.');
  const p = state.players[player];
  const res = drawFromPile(state.drawPile, state.discardPile, state.pendingPenalty, rng);
  let next: GameState = withMove(
    {
      ...state,
      drawPile: res.drawPile,
      discardPile: res.discardPile,
      players: setHand(state.players, player, [...p.hand, ...res.cards]),
      pendingPenalty: 0,
      stalledPasses: 0,
    },
    'draw',
    player,
    res.cards.length,
  );
  if (res.reshuffled) next = withLog(next, 'Deste bitti; açık yığın karıştırılıp yeni deste yapıldı.');
  const short = res.cards.length < state.pendingPenalty ? ' (destede yeterli kart yoktu)' : '';
  return withLog(advance(next), `${p.name} ${res.cards.length} ceza kartı çekti ve sırasını kaybetti${short}.`, {
    kind: 'penalty',
    text: `+${res.cards.length} KART ÇEKİLDİ`,
    player,
  });
}

function pass(state: GameState, player: number): GameState {
  assertTurn(state, player);
  if (!state.drawnCardId) fail('Önce kart çekmelisin.');
  return withLog(advance(state), `${state.players[player].name} çektiği kartı oynamadı.`, {
    kind: 'info',
    text: 'PAS',
    player,
  });
}

function chooseSuit(state: GameState, player: number, suit: Suit): GameState {
  assertTurn(state, player, true);
  if (!state.awaitingSuit) fail('Şu an renk seçilemez.');
  const name = state.players[player].name;
  const next = advance({ ...state, awaitingSuit: false, chosenSuit: suit });
  return withLog(next, `${name} ${SUIT_NAMES[suit]} rengini seçti.`, {
    kind: 'suit',
    text: `VALE İLE SEMBOL: ${SUIT_NAMES[suit].toLocaleUpperCase('tr')}`,
    player,
  });
}

/**
 * Hamle süresi doldu. Oyuncunun adına kart OYNANMAZ:
 * - Vale sonrası sembol seçilmediyse elindeki kartlara göre sembol seçilir (seçim sırayı geçirir).
 * - Bekleyen 7 cezası varsa ceza çekilir ve sıra geçer (normal 7 kuralı).
 * - Zaten kart çektiyse sıra geçer.
 * - Diğer tüm durumlarda 1 kart çekilir ve sıra geçer (oynanabilir kartı olsa bile).
 */
function timeout(state: GameState, player: number, rng: Rng): GameState {
  assertTurn(state, player, true);
  if (state.awaitingSuit) return chooseSuit(state, player, chooseSuitFor(state.players[player].hand));
  if (state.pendingPenalty > 0) return acceptPenalty(state, player, rng);
  const p = state.players[player];
  const notice = { kind: 'draw' as const, player };
  if (state.drawnCardId) {
    return withLog(advance(state), `${p.name} süresi doldu; sıra geçti.`, { ...notice, text: 'SÜRE DOLDU · PAS' });
  }
  const hadMoves = getLegalMoves(state, player).length > 0;
  const res = drawFromPile(state.drawPile, state.discardPile, 1, rng);
  let next: GameState = { ...state, drawPile: res.drawPile, discardPile: res.discardPile };
  if (res.reshuffled) next = withLog(next, 'Deste bitti; açık yığın karıştırılıp yeni deste yapıldı.');
  if (res.cards.length === 0) {
    const stalled = hadMoves ? 0 : state.stalledPasses + 1;
    next = advance({ ...next, stalledPasses: stalled });
    next = withLog(next, `${p.name} süresi doldu; çekecek kart yoktu, sıra geçti.`, {
      ...notice,
      text: 'SÜRE DOLDU · PAS',
    });
    return stalled >= state.players.length ? endRound(next, null, false) : next;
  }
  next = withMove(
    { ...next, players: setHand(next.players, player, [...p.hand, ...res.cards]), stalledPasses: 0 },
    'draw',
    player,
    1,
  );
  return withLog(advance(next), `${p.name} süresi doldu: 1 kart çekti ve sırası geçti.`, {
    ...notice,
    text: 'SÜRE DOLDU · +1 KART',
  });
}

function declareOneCard(state: GameState, player: number): GameState {
  if (state.phase !== 'playing') fail('Tur oynanmıyor.');
  const p = state.players[player];
  if (p.hand.length !== 1) fail('Tek kart yalnızca elde bir kart kaldığında bildirilir.');
  if (state.oneCard[player]?.status !== 'open') fail('Tek kart zaten bildirildi.');
  const oneCard = state.oneCard.map((s, i) => (i === player ? { ...s, status: 'declared' as const } : s));
  return withLog({ ...state, oneCard }, `${p.name}: "TEK KART!"`, { kind: 'oneCard', text: 'TEK KART!', player });
}

/** Tek kart süresi dolduğunda bildirim yapılmadıysa +2 ceza. Sıra değişmez. */
function oneCardPenalty(state: GameState, player: number, since: number, rng: Rng): GameState {
  if (state.phase !== 'playing') fail('Tur oynanmıyor.');
  const p = state.players[player];
  const status = state.oneCard[player];
  if (p.hand.length !== 1 || status?.status !== 'open' || status.since !== since) {
    fail('Bu oyuncuya tek kart cezası uygulanamaz.');
  }
  return applyOneCardPenalty(state, player, rng, 'süresinde TEK KART demedi');
}

function applyOneCardPenalty(state: GameState, player: number, rng: Rng, reason: string): GameState {
  const p = state.players[player];
  const res = drawFromPile(state.drawPile, state.discardPile, ONE_CARD_PENALTY, rng);
  let next: GameState = withMove(
    {
      ...state,
      drawPile: res.drawPile,
      discardPile: res.discardPile,
      players: setHand(state.players, player, [...p.hand, ...res.cards]),
    },
    'draw',
    player,
    res.cards.length,
  );
  if (res.reshuffled) next = withLog(next, 'Deste bitti; açık yığın karıştırılıp yeni deste yapıldı.');
  return withLog(next, `${p.name} ${reason}; ${res.cards.length} ceza kartı çekti.`, {
    kind: 'penalty',
    text: `+${res.cards.length} CEZA (TEK KART DENMEDİ)`,
    player,
  });
}

function nextRound(state: GameState, rng: Rng): GameState {
  if (state.phase !== 'roundEnd') fail('Tur henüz bitmedi.');
  if (state.round + 1 >= state.totalRounds) {
    return withLog({ ...state, phase: 'gameOver' }, 'Oyun bitti!');
  }
  return beginRound(state, state.round + 1, rng);
}

export function applyAction(state: GameState, action: GameAction, rng: Rng = Math.random): GameState {
  return syncOneCard(reduce(state, action, rng));
}

function reduce(state: GameState, action: GameAction, rng: Rng): GameState {
  switch (action.type) {
    case 'cut':
      return cut(state, action.position);
    case 'claim':
      return claim(state, action.count);
    case 'play':
      return play(state, action.player, action.cardId, rng);
    case 'draw':
      return draw(state, action.player, rng);
    case 'acceptPenalty':
      return acceptPenalty(state, action.player, rng);
    case 'pass':
      return pass(state, action.player);
    case 'chooseSuit':
      return chooseSuit(state, action.player, action.suit);
    case 'timeout':
      return timeout(state, action.player, rng);
    case 'declareOneCard':
      return declareOneCard(state, action.player);
    case 'oneCardPenalty':
      return oneCardPenalty(state, action.player, action.since, rng);
    case 'nextRound':
      return nextRound(state, rng);
  }
}

/** Oyundaki tüm kartlar (deste bütünlüğü denetimi için). */
export function allCards(state: GameState): Card[] {
  return [
    ...state.shuffledDeck,
    ...state.drawPile,
    ...state.discardPile,
    ...state.players.flatMap((p) => p.hand),
  ];
}
