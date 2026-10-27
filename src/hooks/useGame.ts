import { useCallback, useEffect, useRef, useState } from 'react';
import { TIMING, randomBotDelay } from '../config/timing';
import { chooseAction, chooseClaimCount, chooseCutPosition } from '../game/ai';
import { applyAction, createGame, IllegalActionError, type GameAction } from '../game/engine';
import type { GameState, PlayerConfig } from '../game/types';

export interface UseGame {
  state: GameState | null;
  error: string | null;
  /** Şu an düşünen botun oyuncu indeksi (yoksa null). */
  thinking: number | null;
  /** Her yeni oyunda artar; arayüzün oyuna özel durumunu sıfırlamak için. */
  gameId: number;
  /** Başlangıçtaki kurallar/hazırlık ekranı geçildi mi? Geçilmeden kimse hamle yapmaz. */
  ready: boolean;
  markReady: () => void;
  /** Yardım (kurallar) açıkken oyun duraklar: botlar ve sayaçlar bekler. */
  paused: boolean;
  setPaused: (p: boolean) => void;
  /** Sıradaki oyuncunun kalan süresi (ms); tur oynanmıyorsa null. */
  turnLeftMs: number | null;
  /** Tek kart bildirimi bekleyen oyuncuların kalan süresi (ms). */
  oneCardLeftMs: Record<number, number>;
  start: (configs: PlayerConfig[]) => void;
  dispatch: (action: GameAction) => void;
  quit: () => void;
}

/** Hamle sırası bir bottaysa o botun yapacağı eylem; değilse null. */
function pendingBotAction(state: GameState): { player: number; action: GameAction } | null {
  if (state.phase === 'cut') {
    const cutter = state.cutterIndex;
    if (state.players[cutter].isHuman) return null;
    return {
      player: cutter,
      action: state.cutPreview
        ? { type: 'claim', count: chooseClaimCount(state.cutPreview) }
        : { type: 'cut', position: chooseCutPosition() },
    };
  }
  if (state.phase === 'playing' && !state.players[state.currentPlayer].isHuman) {
    return { player: state.currentPlayer, action: chooseAction(state, state.currentPlayer) };
  }
  return null;
}

/** Yeni bir hamle sırası başladı mı? (Vale sonrası renk seçimi aynı sıranın parçasıdır.) */
function isNewTurn(prev: GameState | null, cur: GameState): boolean {
  if (!prev || prev.phase !== cur.phase || prev.round !== cur.round) return true;
  if (prev.currentPlayer !== cur.currentPlayer) return true;
  // İki kişilik oyunda As: aynı oyuncu yeniden sıra alır.
  const move = cur.lastMove;
  return (
    !!move &&
    move.kind === 'play' &&
    move.version !== prev.lastMove?.version &&
    move.player === cur.currentPlayer &&
    !cur.awaitingSuit
  );
}

const TICK_MS = 200;

export function useGame(): UseGame {
  const [state, setState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [thinking, setThinking] = useState<number | null>(null);
  const [gameId, setGameId] = useState(0);
  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(false);
  const [turnLeftMs, setTurnLeftMs] = useState<number | null>(null);
  const [oneCardLeftMs, setOneCardLeftMs] = useState<Record<number, number>>({});
  const stateRef = useRef(state);
  stateRef.current = state;

  const dispatch = useCallback((action: GameAction) => {
    const current = stateRef.current;
    if (!current) return;
    try {
      const next = applyAction(current, action);
      stateRef.current = next;
      setState(next);
      setError(null);
    } catch (e) {
      if (e instanceof IllegalActionError) setError(e.message);
      else throw e;
    }
  }, []);

  /** Zamanlayıcıların tetiklediği eylemler: geçersiz hale geldilerse sessizce yok sayılır. */
  const dispatchQuiet = useCallback((action: GameAction) => {
    const current = stateRef.current;
    if (!current) return;
    try {
      const next = applyAction(current, action);
      stateRef.current = next;
      setState(next);
    } catch (e) {
      if (!(e instanceof IllegalActionError)) throw e;
    }
  }, []);

  const start = useCallback((configs: PlayerConfig[]) => {
    setError(null);
    setThinking(null);
    setPaused(false);
    setGameId((id) => id + 1);
    setReady(false);
    setState(createGame(configs));
  }, []);

  const quit = useCallback(() => {
    setThinking(null);
    setPaused(false);
    setState(null);
  }, []);

  const active = ready && !paused;

  // Bot sürücüsü: her durum sürümü için en fazla BİR zamanlayıcı kurulur. Zamanlayıcı
  // tetiklendiğinde durum değişmişse (ör. başka bir hamle olmuşsa) hiçbir şey yapılmaz;
  // böylece aynı bot iki kez hamle yapamaz ve animasyonlar çakışmaz.
  useEffect(() => {
    if (!state || !active) {
      setThinking(null);
      return;
    }
    const pending = pendingBotAction(state);
    if (!pending) {
      setThinking(null);
      return;
    }
    const scheduledVersion = state.version;
    setThinking(pending.player);
    const t = window.setTimeout(() => {
      const current = stateRef.current;
      if (!current || current.version !== scheduledVersion) return;
      setThinking(null);
      dispatch(pending.action);
    }, randomBotDelay());
    return () => window.clearTimeout(t);
  }, [state, active, dispatch]);

  // Botlar elinde tek kart kalınca kısa bir gecikmeyle otomatik "TEK KART" der.
  useEffect(() => {
    if (!state || !active || state.phase !== 'playing') return;
    const timers = state.oneCard.flatMap((s, i) =>
      s.status === 'open' && !state.players[i].isHuman
        ? [window.setTimeout(() => dispatchQuiet({ type: 'declareOneCard', player: i }), TIMING.botOneCardDelayMs)]
        : [],
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [state, active, dispatchQuiet]);

  // Sayaçlar: tek bir tıkırtı döngüsü hem 20 sn tur süresini hem tek kart pencerelerini yürütür.
  // Duraklatılınca (yardım açık) süreler donar.
  const turnRef = useRef<{ prev: GameState | null; left: number; firedVersion: number }>({
    prev: null,
    left: TIMING.turnMs,
    firedVersion: -1,
  });
  const oneCardRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!state) return;
    const t = turnRef.current;
    if (isNewTurn(t.prev, state)) {
      t.left = TIMING.turnMs;
      t.firedVersion = -1;
    }
    t.prev = state;
    // Kapanmış tek kart pencerelerini temizle, yenilerini başlat.
    const keys = new Set<string>();
    state.oneCard.forEach((s, i) => {
      if (s.status !== 'open') return;
      const key = `${i}:${s.since}`;
      keys.add(key);
      if (!(key in oneCardRef.current)) oneCardRef.current[key] = TIMING.oneCardWindowMs;
    });
    for (const key of Object.keys(oneCardRef.current)) if (!keys.has(key)) delete oneCardRef.current[key];
  }, [state]);

  const phase = state?.phase;
  useEffect(() => {
    if (!active || phase !== 'playing') {
      setTurnLeftMs(phase === 'playing' ? turnRef.current.left : null);
      return;
    }
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const dt = now - last;
      last = now;
      const cur = stateRef.current;
      if (!cur || cur.phase !== 'playing') return;
      const t = turnRef.current;
      t.left = Math.max(0, t.left - dt);
      setTurnLeftMs(t.left);
      // Süre doldu: 1 kart çekilir ve sıra geçer; oyuncu adına kart oynanmaz (bir kez).
      if (t.left === 0 && cur.players[cur.currentPlayer].isHuman && t.firedVersion !== cur.version) {
        t.firedVersion = cur.version;
        dispatchQuiet({ type: 'timeout', player: cur.currentPlayer });
      }
      const left: Record<number, number> = {};
      for (const key of Object.keys(oneCardRef.current)) {
        const [player, since] = key.split(':').map(Number);
        const remaining = Math.max(0, oneCardRef.current[key] - dt);
        oneCardRef.current[key] = remaining;
        left[player] = remaining;
        if (remaining === 0 && cur.players[player].isHuman) {
          delete oneCardRef.current[key];
          dispatchQuiet({ type: 'oneCardPenalty', player, since });
        }
      }
      setOneCardLeftMs(left);
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [phase, active, dispatchQuiet]);

  const markReady = useCallback(() => setReady(true), []);

  return {
    state,
    error,
    thinking,
    gameId,
    ready,
    markReady,
    paused,
    setPaused,
    turnLeftMs,
    oneCardLeftMs,
    start,
    dispatch,
    quit,
  };
}
