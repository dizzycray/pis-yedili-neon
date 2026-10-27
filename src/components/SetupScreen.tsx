import { useState } from 'react';
import type { PlayerConfig } from '../game/types';
import { CardView } from './CardView';
import { RulesOverlay } from './Rules';
import { SuitGlyph } from './SuitIcon';

interface Props {
  onStart: (configs: PlayerConfig[]) => void;
}

export function SetupScreen({ onStart }: Props) {
  const [mode, setMode] = useState<'single' | 'local'>('single');
  const [count, setCount] = useState(2);
  const [names, setNames] = useState(['Oyuncu 1', 'Oyuncu 2', 'Oyuncu 3', 'Oyuncu 4']);
  const [showRules, setShowRules] = useState(false);
  // Yerel modda her koltuk insan ya da bot olabilir (ilk koltuk her zaman insan).
  const [bots, setBots] = useState([false, false, false, false]);

  const start = () => {
    if (mode === 'single') {
      onStart([
        { name: names[0] || 'Sen', isHuman: true },
        // Bot adları boş bırakılır; oyun başlarken sabit bot adları verilir.
        ...[1, 2, 3].map(() => ({ name: '', isHuman: false })),
      ]);
    } else {
      onStart(
        names.slice(0, count).map((name, i) => ({
          // Bot koltuğunda varsayılan ad kaldıysa boş bırakılır ve sabit bot adı verilir.
          name: bots[i] && (!name.trim() || name === `Oyuncu ${i + 1}`) ? '' : name || `Oyuncu ${i + 1}`,
          isHuman: !bots[i],
        })),
      );
    }
  };

  return (
    <main className="setup">
      <header className="setup-hero">
        <div className="title-block">
          <span className="suit-rule" aria-hidden>
            <SuitGlyph suit="sinek" size={12} />
            <SuitGlyph suit="kupa" size={12} />
            <SuitGlyph suit="karo" size={12} />
            <SuitGlyph suit="maca" size={12} />
          </span>
          <h1 className="logo">PİS YEDİLİ</h1>
          <span className="neon-rule" aria-hidden />
          <p className="tagline">// NEON MASA · 4 TUR · EN DÜŞÜK PUAN KAZANIR</p>
        </div>
        {/* Elde tutulan üç kart: sabit açılarla hafif asimetrik bir yelpaze, panelin kenarına yaslanır. */}
        <div className="hero-fan" aria-hidden>
          <CardView card={{ id: 'h1', suit: 'maca', rank: '7' }} size="md" className="hero-card h1" />
          <CardView card={{ id: 'h2', suit: 'kupa', rank: 'J' }} size="md" className="hero-card h2" />
          <CardView card={{ id: 'h3', suit: 'sinek', rank: 'A' }} size="md" className="hero-card h3" />
        </div>
      </header>

      <section className="panel setup-panel">
        <div className="mode-switch" role="tablist" aria-label="Oyun modu">
          <button
            role="tab"
            aria-selected={mode === 'single'}
            className={mode === 'single' ? 'active' : ''}
            onClick={() => setMode('single')}
          >
            <span className="mode-title">
              <SuitGlyph suit="maca" size={13} /> Tek Oyunculu
            </span>
            <small>3 yapay zekâya karşı</small>
          </button>
          <button
            role="tab"
            aria-selected={mode === 'local'}
            className={mode === 'local' ? 'active' : ''}
            onClick={() => setMode('local')}
          >
            <span className="mode-title">
              <SuitGlyph suit="kupa" size={13} /> Yerel Çok Oyunculu
            </span>
            <small>Aynı cihazda 2–4 kişi</small>
          </button>
        </div>

        {mode === 'local' && (
          <div className="count-picker">
            <span>Oyuncu sayısı</span>
            {[2, 3, 4].map((n) => (
              <button key={n} className={count === n ? 'active' : ''} onClick={() => setCount(n)}>
                {n}
              </button>
            ))}
          </div>
        )}

        <div className="name-fields">
          {(mode === 'single' ? [0] : Array.from({ length: count }, (_, i) => i)).map((i) => (
            <label key={i}>
              <span>{mode === 'single' ? 'Adın' : `${i + 1}. oyuncu`}</span>
              <div className="name-row">
                <input
                  value={names[i]}
                  maxLength={14}
                  onChange={(e) => setNames(names.map((n, j) => (j === i ? e.target.value : n)))}
                />
                {mode === 'local' && i > 0 && (
                  <button
                    type="button"
                    className={`seat-kind ${bots[i] ? 'bot' : ''}`}
                    onClick={() => setBots(bots.map((b, j) => (j === i ? !b : b)))}
                    aria-pressed={bots[i]}
                  >
                    {bots[i] ? 'BOT' : 'İNSAN'}
                  </button>
                )}
              </div>
            </label>
          ))}
        </div>

        <button className="btn btn-primary btn-big" onClick={start}>
          OYUNU BAŞLAT
        </button>
        <button className="btn btn-ghost" onClick={() => setShowRules(true)}>
          OYUN KURALLARI
        </button>
      </section>
      {showRules && <RulesOverlay mode="help" onClose={() => setShowRules(false)} />}
    </main>
  );
}
