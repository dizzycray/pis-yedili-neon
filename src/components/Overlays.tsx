import { chooseSuitFor } from '../game/ai';
import { SUIT_NAMES, SUITS } from '../game/deck';
import type { Card, Suit } from '../game/types';
import { SuitGlyph } from './SuitIcon';
import { getWinners, handValue } from '../game/scoring';
import type { GameState } from '../game/types';

/** Vale atıldıktan sonra devam edilecek rengi seçme penceresi. Seçim yapılana kadar oyun bekler. */
export function SuitPicker({ hand, onPick }: { hand: Card[]; onPick: (suit: Suit) => void }) {
  const suggested = chooseSuitFor(hand);
  return (
    <div className="overlay">
      <div className="panel modal" role="dialog" aria-label="Renk seç">
        <h2 className="neon-title">VALE · RENK SEÇ</h2>
        <p className="muted">Sıradaki oyuncu bu renkte ya da bir Vale oynamak zorunda.</p>
        <div className="suit-picker">
          {SUITS.map((suit) => {
            const count = hand.filter((c) => c.suit === suit).length;
            const red = suit === 'kupa' || suit === 'karo';
            return (
              <button
                key={suit}
                type="button"
                className={`suit-option ${red ? 'red' : 'black'} ${suit === suggested ? 'best' : ''}`}
                onClick={() => onPick(suit)}
              >
                <SuitGlyph suit={suit} size={40} />
                <strong>{SUIT_NAMES[suit].toLocaleUpperCase('tr')}</strong>
                <small>Elinde {count} kart</small>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ScoreTable({ state }: { state: GameState }) {
  return (
    <div className="score-table-wrap">
      <table className="score-table">
        <thead>
          <tr>
            <th>Oyuncu</th>
            {Array.from({ length: state.totalRounds }, (_, i) => (
              <th key={i}>{i + 1}. Tur</th>
            ))}
            <th>Toplam</th>
          </tr>
        </thead>
        <tbody>
          {state.players.map((p) => (
            <tr key={p.id}>
              <td>{p.name}</td>
              {Array.from({ length: state.totalRounds }, (_, i) => {
                const r = state.roundResults[i];
                return (
                  <td key={i} className={r?.winnerId === p.id ? 'win-cell' : ''}>
                    {p.roundScores[i] ?? '–'}
                    {r?.jackFinish && r.winnerId !== p.id ? <sup>×2</sup> : null}
                  </td>
                );
              })}
              <td className="total-cell">{p.totalScore}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RoundSummary({ state, onNext }: { state: GameState; onNext: () => void }) {
  const result = state.roundResults.at(-1)!;
  const last = state.round + 1 >= state.totalRounds;
  return (
    <div className="overlay">
      <div className="panel modal summary-modal">
        <h2 className="neon-title">{state.round + 1}. TUR BİTTİ</h2>
        <p className="summary-headline">
          {result.winnerId === null
            ? 'Tur kilitlendi: kimse oynayamadı, herkes elindeki puanı aldı.'
            : `${state.players[result.winnerId].name} elini bitirdi!`}
        </p>
        {result.jackFinish && <p className="jack-banner">VALE BİTİŞİ · RAKİP PUANLARI ×2</p>}
        <ul className="round-hands">
          {state.players.map((p, i) => (
            <li key={p.id}>
              <span>{p.name}</span>
              <span className="muted">
                {p.hand.length} kart · {handValue(p.hand)} puan
              </span>
              <strong>+{result.scores[i]}</strong>
            </li>
          ))}
        </ul>
        <ScoreTable state={state} />
        <button className="btn btn-primary btn-big" onClick={onNext}>
          {last ? 'SONUÇLARI GÖR' : 'SONRAKİ TUR'}
        </button>
      </div>
    </div>
  );
}

export function GameOver({ state, onRestart, onMenu }: { state: GameState; onRestart: () => void; onMenu: () => void }) {
  const winners = getWinners(state.players);
  const ranking = state.players.slice().sort((a, b) => a.totalScore - b.totalScore);
  return (
    <div className="overlay">
      <div className="panel modal summary-modal gameover">
        <h2 className="logo small glitch" data-text="OYUN BİTTİ">
          OYUN BİTTİ
        </h2>
        <p className="winner-text">
          {winners.length > 1 ? 'Beraberlik: ' : 'Kazanan: '}
          <b>{winners.map((w) => w.name).join(' & ')}</b> ({winners[0].totalScore} puan)
        </p>
        <ol className="ranking">
          {ranking.map((p) => (
            <li key={p.id}>
              <span>{p.name}</span>
              <strong>{p.totalScore}</strong>
            </li>
          ))}
        </ol>
        <ScoreTable state={state} />
        <div className="btn-row">
          <button className="btn btn-primary" onClick={onRestart}>
            YENİDEN OYNA
          </button>
          <button className="btn btn-ghost" onClick={onMenu}>
            ANA MENÜ
          </button>
        </div>
      </div>
    </div>
  );
}
