import { useState } from 'react';
import { MAX_CUT, MIN_CUT, SPECIAL_CUT_RANKS } from '../game/deckCut';
import type { GameAction } from '../game/engine';
import type { GameState } from '../game/types';
import { CardView } from './CardView';

interface Props {
  state: GameState;
  dispatch: (a: GameAction) => void;
}

export function CutPanel({ state, dispatch }: Props) {
  const cutter = state.players[state.cutterIndex];
  const preview = state.cutPreview;
  const [pos, setPos] = useState(26);

  if (!cutter.isHuman) {
    return (
      <div className="overlay">
        <div className="panel modal cut-modal">
          <h2 className="neon-title">{state.round + 1}. TUR · DESTE KESME</h2>
          <div className="deck-stack" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <CardView key={i} faceDown size="lg" style={{ transform: `translate(${i * 3}px, ${-i * 3}px)` }} />
            ))}
          </div>
          <p className="pulse-text">
            {preview
              ? `${cutter.name} alt karta bakıyor ve karar veriyor…`
              : `${cutter.name} desteyi kesiyor…`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overlay">
      <div className="panel modal cut-modal">
        <h2 className="neon-title">{state.round + 1}. TUR · DESTE KESME</h2>
        {!preview ? (
          <>
            <p>
              <b>{cutter.name}</b>, deste karıldı ve kapalı duruyor. Nereden keseceğini seç: üstten{' '}
              <b>{pos}</b> kart elinde kalacak ve alt kartına bakacaksın.
            </p>
            <div className="deck-split" aria-hidden>
              <div className="split-half">
                {[0, 1, 2].map((i) => (
                  <CardView key={i} faceDown size="md" style={{ transform: `translate(${i * 2}px, ${-i * 2}px)` }} />
                ))}
                <span>{pos} kart</span>
              </div>
              <div className="split-half lower">
                {[0, 1, 2].map((i) => (
                  <CardView key={i} faceDown size="md" style={{ transform: `translate(${i * 2}px, ${-i * 2}px)` }} />
                ))}
                <span>{52 - pos} kart</span>
              </div>
            </div>
            <input
              type="range"
              className="cut-slider"
              min={MIN_CUT}
              max={MAX_CUT}
              value={pos}
              onChange={(e) => setPos(Number(e.target.value))}
              aria-label="Kesme noktası"
            />
            <button className="btn btn-primary btn-big" onClick={() => dispatch({ type: 'cut', position: pos })}>
              DESTEYİ KES
            </button>
          </>
        ) : (
          <>
            <p>
              Elindeki yarının alt kartı ve üstündeki dizi (alttan yukarı). Bu bilgiyi yalnızca sen görüyorsun.
            </p>
            <div className="cut-sequence">
              {preview.sequence.map((card, i) => (
                <div key={card.id} className="seq-slot">
                  <CardView
                    card={card}
                    size="md"
                    highlight={SPECIAL_CUT_RANKS.includes(card.rank)}
                    className={i === 0 ? 'bottom-card' : ''}
                  />
                  <small>{i === 0 ? 'ALT KART' : `${i + 1}.`}</small>
                </div>
              ))}
            </div>
            {preview.eligible ? (
              <>
                <p className="ok-text">
                  Dizide özel kart (J, A veya 7) var! Alttan başlayarak ardışık kaç kart almak istersin? Tek tek kart
                  seçemezsin.
                </p>
                <div className="claim-buttons">
                  {preview.allowedCounts.map((k) => (
                    <button key={k} className="btn btn-cyan" onClick={() => dispatch({ type: 'claim', count: k })}>
                      {k} kart al
                    </button>
                  ))}
                  <button className="btn btn-ghost" onClick={() => dispatch({ type: 'claim', count: null })}>
                    Alma, normal dağıt
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="warn-text">Dizide J, A veya 7 yok. Kart alamazsın; kartlar normal dağıtılacak.</p>
                <button className="btn btn-primary" onClick={() => dispatch({ type: 'claim', count: null })}>
                  KARTLARI DAĞIT
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
