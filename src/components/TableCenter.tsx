import { TIMING } from '../config/timing';
import { SUIT_NAMES } from '../game/deck';
import type { GameState } from '../game/types';
import type { SeatPosition } from '../ui/seating';
import { CardView } from './CardView';
import { SuitGlyph } from './SuitIcon';

interface Props {
  state: GameState;
  canDraw: boolean;
  onDraw: () => void;
  message: string;
  thinkingName: string | null;
  /** Oyuncu kimliğinden masadaki konumuna (kart hareketinin yönü için). */
  seatOf: (playerId: number) => SeatPosition;
  /** Sıradaki oyuncunun kalan hamle süresi (ms). */
  turnLeftMs: number | null;
}

/** Bir koltuğun masa merkezine göre yönü (kartın nereden gelip nereye gideceği). */
const FROM: Record<SeatPosition, [string, string]> = {
  bottom: ['0px', '220px'],
  top: ['0px', '-200px'],
  left: ['-260px', '0px'],
  right: ['260px', '0px'],
};

const TILTS = [-8, 5, -3];

function TurnTimer({ leftMs, name }: { leftMs: number; name: string }) {
  const ratio = Math.max(0, Math.min(1, leftMs / TIMING.turnMs));
  const secs = Math.ceil(leftMs / 1000);
  return (
    <div className={`turn-timer ${secs <= 5 ? 'urgent' : ''}`} role="timer" aria-label={`${name}: ${secs} saniye`}>
      <svg viewBox="0 0 36 36" aria-hidden>
        <circle cx="18" cy="18" r="15.5" className="track" />
        <circle
          cx="18"
          cy="18"
          r="15.5"
          className="bar"
          strokeDasharray={`${(ratio * 97.4).toFixed(1)} 97.4`}
          transform="rotate(-90 18 18)"
        />
      </svg>
      <span>{secs}</span>
    </div>
  );
}

export function TableCenter({ state, canDraw, onDraw, message, thinkingName, seatOf, turnLeftMs }: Props) {
  const under = state.discardPile.slice(-3, -1);
  const top = state.discardPile.at(-1);
  const move = state.lastMove;
  const playVector = move?.kind === 'play' ? FROM[seatOf(move.player)] : null;
  const drawVector = move?.kind === 'draw' ? FROM[seatOf(move.player)] : null;

  return (
    <section className="felt">
      <div className="piles">
        <div className="pile">
          <button
            type="button"
            className={`draw-pile ${canDraw ? 'can-draw' : ''}`}
            onClick={onDraw}
            disabled={!canDraw}
            aria-label={`Desteden kart çek (${state.drawPile.length} kart)`}
          >
            {state.drawPile.length > 0 ? (
              [0, 1, 2].map((i) => (
                <CardView
                  key={i}
                  faceDown
                  size="lg"
                  className="stacked"
                  style={{ transform: `translate(${i * 2}px, ${-i * 2}px)` }}
                />
              ))
            ) : (
              <div className="card card-lg empty-slot">BOŞ</div>
            )}
            {/* Çekilen kartlar desteden oyuncunun koltuğuna doğru uçar. */}
            {move && drawVector &&
              Array.from({ length: Math.min(move.count, 4) }, (_, i) => (
                <CardView
                  key={`${move.version}-${i}`}
                  faceDown
                  size="lg"
                  className="flying-out"
                  style={{
                    ['--to-x' as string]: drawVector[0],
                    ['--to-y' as string]: drawVector[1],
                    animationDelay: `${i * 90}ms`,
                  }}
                />
              ))}
          </button>
          <span className="pile-label">DESTE · {state.drawPile.length}</span>
        </div>

        <div className="pile">
          <div className="discard-pile">
            {under.map((c, i) => (
              <CardView
                key={c.id}
                card={c}
                size="lg"
                className="stacked under"
                style={{ transform: `rotate(${TILTS[(state.discardPile.length + i) % 3]}deg)` }}
              />
            ))}
            {top ? (
              <CardView
                key={`${top.id}-${state.discardPile.length}`}
                card={top}
                size="lg"
                className={`stacked top-discard ${playVector ? 'flying-in' : ''} ${
                  state.pendingPenalty > 0 ? 'penalty-glow' : ''
                }`}
                style={
                  playVector
                    ? { ['--from-x' as string]: playVector[0], ['--from-y' as string]: playVector[1] }
                    : undefined
                }
              />
            ) : (
              <div className="card card-lg empty-slot sinek-slot">
                <SuitGlyph suit="sinek" size={26} />
                <small>SİNEK İLE AÇ</small>
              </div>
            )}
          </div>
          <span className="pile-label">AÇIK KART</span>
        </div>
      </div>

      {state.chosenSuit && (
        <div className="suit-demand" role="status">
          İSTENEN RENK
          <span className={`suit-chip ${state.chosenSuit === 'kupa' || state.chosenSuit === 'karo' ? 'red' : 'black'}`}>
            <SuitGlyph suit={state.chosenSuit} size={14} />
          </span>
          {SUIT_NAMES[state.chosenSuit].toLocaleUpperCase('tr')}
        </div>
      )}

      {state.pendingPenalty > 0 && (
        <div className="penalty-meter" role="status">
          <span>CEZA</span>
          <strong>+{state.pendingPenalty}</strong>
        </div>
      )}

      <div className="felt-status">
        {state.phase === 'playing' && turnLeftMs != null && (
          <TurnTimer leftMs={turnLeftMs} name={state.players[state.currentPlayer].name} />
        )}
      <p className="turn-message" role="status" aria-live="polite">
        {thinkingName ? (
          <>
            {thinkingName} düşünüyor<span className="dots"><i>.</i><i>.</i><i>.</i></span>
          </>
        ) : (
          message
        )}
      </p>
      </div>
    </section>
  );
}
