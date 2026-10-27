import { useEffect, useMemo, useRef, useState } from 'react';
import { TIMING } from '../config/timing';
import type { GameAction } from '../game/engine';
import { SUIT_NAMES } from '../game/deck';
import { getLegalMoves, isOpening } from '../game/rules';
import type { GameState } from '../game/types';
import { getSeats, resolveViewer, type SeatPosition } from '../ui/seating';
import { CutPanel } from './CutPanel';
import { HandView } from './HandView';
import { usePanelNotices } from '../hooks/usePanelNotices';
import { GameOver, RoundSummary, SuitPicker } from './Overlays';
import { PlayerPanel } from './PlayerPanel';
import { RulesOverlay } from './Rules';
import { TableCenter } from './TableCenter';

interface Props {
  state: GameState;
  error: string | null;
  thinking: number | null;
  ready: boolean;
  onReady: () => void;
  paused: boolean;
  setPaused: (p: boolean) => void;
  turnLeftMs: number | null;
  oneCardLeftMs: Record<number, number>;
  dispatch: (a: GameAction) => void;
  onRestart: () => void;
  onMenu: () => void;
}

function turnMessage(state: GameState, viewer: number): string {
  if (state.phase === 'roundEnd') return 'Tur bitti! Sonuçlar hesaplanıyor…';
  if (state.phase !== 'playing') return '';
  const cur = state.players[state.currentPlayer];
  if (state.awaitingSuit) {
    return viewer === state.currentPlayer ? 'Vale attın: devam edilecek rengi seç.' : `${cur.name} renk seçiyor…`;
  }
  if (viewer !== state.currentPlayer) {
    if (state.pendingPenalty > 0) return `${cur.name}: ${state.pendingPenalty} kartlık ceza karşısında…`;
    return isOpening(state) ? `${cur.name} Sinek ile açacak…` : `Sıra: ${cur.name}`;
  }
  const legal = getLegalMoves(state, state.currentPlayer);
  const me = state.players[viewer];
  if (me.hand.length === 1 && state.oneCard[viewer]?.status !== 'declared' && legal.length) {
    return 'Son kartını atmadan önce TEK KART de! Demezsen +2 ceza.';
  }
  if (isOpening(state)) {
    return legal.length ? 'Açılış senin: bir SİNEK oyna.' : 'Sineğin yok — Sinek bulana kadar desteden çek.';
  }
  if (state.pendingPenalty > 0) {
    return legal.length
      ? `+${state.pendingPenalty} CEZA! 7 ile karşılık ver ya da cezayı al.`
      : `+${state.pendingPenalty} CEZA! 7'n yok — cezayı al.`;
  }
  if (state.drawnCardId) return 'Çektiğin kart oynanabilir: oyna ya da pas geç.';
  if (state.chosenSuit && legal.length) return `İstenen renk ${SUIT_NAMES[state.chosenSuit]}: ${SUIT_NAMES[state.chosenSuit]} ya da Vale oyna.`;
  return legal.length ? 'Sıra sende: renge ya da değere uyan bir kart oyna.' : 'Uyan kartın yok — desteden 1 kart çek.';
}

export function GameBoard({
  state,
  error,
  thinking,
  ready,
  onReady,
  paused,
  setPaused,
  turnLeftMs,
  oneCardLeftMs,
  dispatch,
  onRestart,
  onMenu,
}: Props) {
  const humans = state.players.filter((p) => p.isHuman);
  const [showLog, setShowLog] = useState(false);
  const notices = usePanelNotices(state);
  const lastViewer = useRef<number | null>(null);

  // Alt koltuk: hamle sırası olan insan oyuncu (aynı cihazda) ya da tek insan oyuncu.
  const viewer = resolveViewer(state, lastViewer.current);
  lastViewer.current = viewer;
  const seats = useMemo(() => getSeats(state.players.length, viewer), [state.players.length, viewer]);
  const seatOf = (id: number): SeatPosition => seats.find((s) => s.playerId === id)?.position ?? 'top';

  // Tur bitince son kartın masaya inmesi görülsün diye sonuç ekranı gecikmeli açılır.
  const [summaryOpen, setSummaryOpen] = useState(false);
  useEffect(() => {
    if (state.phase !== 'roundEnd') {
      setSummaryOpen(false);
      return;
    }
    const t = window.setTimeout(() => setSummaryOpen(true), TIMING.roundEndDelayMs);
    return () => window.clearTimeout(t);
  }, [state.phase, state.round]);

  const isViewerTurn = ready && state.phase === 'playing' && viewer === state.currentPlayer;
  const legal = useMemo(
    () => (isViewerTurn ? getLegalMoves(state, state.currentPlayer) : []),
    [state, isViewerTurn],
  );
  const legalIds = useMemo(() => new Set(legal.map((c) => c.id)), [legal]);
  const canDraw =
    isViewerTurn && !state.awaitingSuit && state.pendingPenalty === 0 && !state.drawnCardId && legal.length === 0;
  const choosingSuit = isViewerTurn && state.awaitingSuit;
  const me = state.players[viewer];
  const meActive = state.phase === 'playing' && state.currentPlayer === me.id;
  const meOneCard = state.oneCard[me.id];
  const canDeclare = ready && state.phase === 'playing' && me.hand.length === 1 && meOneCard?.status === 'open';
  const myNotice = notices[me.id];

  return (
    <div className="board" style={{ ['--card-move' as string]: `${TIMING.cardMoveMs}ms` }}>
      <header className="topbar">
        <div className="brand">
          PİS<span>7</span>
        </div>
        <div className="round-indicator" aria-label={`Tur ${state.round + 1} / ${state.totalRounds}`}>
          {Array.from({ length: state.totalRounds }, (_, i) => (
            <span
              key={i}
              className={`round-dot ${i < state.round ? 'done' : ''} ${i === state.round ? 'current' : ''}`}
            />
          ))}
          <strong>
            TUR {state.round + 1}/{state.totalRounds}
          </strong>
        </div>
        <div className="topbar-actions">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setPaused(true)}
            aria-label="Oyun kurallarını göster (oyun duraklar)"
          >
            ? Kurallar
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowLog((v) => !v)}>
            Kayıt
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              if (window.confirm('Oyundan çıkılsın mı? İlerleme kaybolur.')) onMenu();
            }}
          >
            Çık
          </button>
        </div>
      </header>

      <div className={`table table-${state.players.length}p`}>
        {seats
          .filter((s) => s.position !== 'bottom')
          .map((s) => (
            <PlayerPanel
              key={s.playerId}
              player={state.players[s.playerId]}
              position={s.position}
              active={state.phase === 'playing' && state.currentPlayer === s.playerId}
              thinking={thinking === s.playerId}
              isCutter={state.cutterIndex === s.playerId}
              isStarter={state.starterIndex === s.playerId}
              notice={notices[s.playerId]}
              oneCard={state.oneCard[s.playerId]}
              oneCardLeftMs={oneCardLeftMs[s.playerId]}
              onDeclareOneCard={() => dispatch({ type: 'declareOneCard', player: s.playerId })}
            />
          ))}
        <TableCenter
          state={state}
          canDraw={canDraw}
          onDraw={() => dispatch({ type: 'draw', player: viewer })}
          message={turnMessage(state, viewer)}
          thinkingName={thinking !== null && state.phase === 'playing' ? state.players[thinking].name : null}
          seatOf={seatOf}
          turnLeftMs={ready ? turnLeftMs : null}
        />
      </div>

      <section className={`my-area ${meActive ? 'active' : ''}`} data-player={me.id}>
        <div className="my-bar">
          <div className="my-info">
            <span className={`avatar ${me.isHuman ? 'human' : 'ai'}`} aria-hidden>
              ◉
            </span>
            <strong>{me.name}</strong>
            <span className="seat-stats inline">
              <span>
                <b>{me.hand.length}</b> kart
              </span>
              <span>
                <b className="score">{me.totalScore}</b> puan
              </span>
            </span>
            {state.cutterIndex === me.id && <em className="chip chip-cut">KESEN</em>}
            {state.starterIndex === me.id && <em className="chip chip-start">AÇAN</em>}
            {meActive && <em className="chip chip-turn">SIRA SENDE</em>}
            <span className="seat-notice-slot inline" aria-live="polite">
              {myNotice && (
                <span key={myNotice.id} className={`seat-notice notice-${myNotice.kind}`}>
                  {myNotice.text}
                </span>
              )}
            </span>
          </div>
          <div className="actions">
            {me.isHuman && (
              <button
                className={`btn btn-one ${meOneCard?.status === 'declared' ? 'declared' : ''}`}
                disabled={!canDeclare}
                onClick={() => dispatch({ type: 'declareOneCard', player: me.id })}
                title="Elinde tek kart kaldığında bas"
              >
                {meOneCard?.status === 'declared' && me.hand.length === 1
                  ? '✓ TEK KART BİLDİRİLDİ'
                  : canDeclare
                    ? `TEK KART! (${Math.ceil((oneCardLeftMs[me.id] ?? 0) / 1000)}s)`
                    : 'TEK KART'}
              </button>
            )}
            {isViewerTurn && state.pendingPenalty > 0 && (
              <button className="btn btn-red" onClick={() => dispatch({ type: 'acceptPenalty', player: me.id })}>
                CEZAYI AL (+{state.pendingPenalty})
              </button>
            )}
            {canDraw && (
              <button className="btn btn-cyan" onClick={() => dispatch({ type: 'draw', player: me.id })}>
                {isOpening(state) ? 'SİNEK ARA' : 'KART ÇEK'}
              </button>
            )}
            {isViewerTurn && state.drawnCardId && (
              <button className="btn btn-ghost" onClick={() => dispatch({ type: 'pass', player: me.id })}>
                PAS GEÇ
              </button>
            )}
          </div>
        </div>
        {error && <p className="error-text">{error}</p>}
        {ready ? (
          <HandView
            hand={me.hand}
            legalIds={legalIds}
            drawnCardId={state.drawnCardId}
            isTurn={isViewerTurn}
            onPlay={(cardId) => dispatch({ type: 'play', player: me.id, cardId })}
          />
        ) : (
          <div className="hand hand-placeholder" />
        )}
      </section>

      {showLog && (
        <aside className="log-panel panel">
          <div className="log-head">
            <strong>OYUN KAYDI</strong>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowLog(false)}>
              Kapat
            </button>
          </div>
          <ol>
            {state.log
              .slice()
              .reverse()
              .map((line, i) => (
                <li key={state.log.length - i}>{line}</li>
              ))}
          </ol>
        </aside>
      )}

      {/* Başlangıç: kurallar ekranı yeni oyunda yalnızca BİR kez, ilk el başlamadan önce. */}
      {!ready && <RulesOverlay mode="start" hotseatNames={humans.map((p) => p.name)} onClose={onReady} />}
      {ready && paused && <RulesOverlay mode="help" onClose={() => setPaused(false)} />}
      {choosingSuit && (
        <SuitPicker hand={me.hand} onPick={(suit) => dispatch({ type: 'chooseSuit', player: me.id, suit })} />
      )}
      {ready && state.phase === 'cut' && <CutPanel key={state.round} state={state} dispatch={dispatch} />}
      {state.phase === 'roundEnd' && summaryOpen && (
        <RoundSummary state={state} onNext={() => dispatch({ type: 'nextRound' })} />
      )}
      {state.phase === 'gameOver' && <GameOver state={state} onRestart={onRestart} onMenu={onMenu} />}
    </div>
  );
}
