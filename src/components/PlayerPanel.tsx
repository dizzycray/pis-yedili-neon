import type { OneCardState, Player } from '../game/types';
import type { PanelNotice } from '../hooks/usePanelNotices';
import type { SeatPosition } from '../ui/seating';
import { CardView } from './CardView';

interface Props {
  player: Player;
  position: SeatPosition;
  active: boolean;
  thinking: boolean;
  isCutter: boolean;
  isStarter: boolean;
  notice?: PanelNotice;
  oneCard?: OneCardState;
  oneCardLeftMs?: number;
  /** Aynı cihazdaki insan oyuncu alt koltukta değilken de "TEK KART" diyebilsin. */
  onDeclareOneCard?: () => void;
}

const MAX_BACKS = 8;

/** Rakip koltuğu: isim, kalan kart, puan, kapalı kart yelpazesi ve hamle bildirimi. */
export function PlayerPanel({
  player,
  position,
  active,
  thinking,
  isCutter,
  isStarter,
  notice,
  oneCard,
  oneCardLeftMs,
  onDeclareOneCard,
}: Props) {
  const shown = Math.min(player.hand.length, MAX_BACKS);
  const canDeclare = oneCard?.status === 'open' && player.isHuman && onDeclareOneCard;
  return (
    <div className={`seat seat-${position} ${active ? 'active' : ''}`} data-player={player.id}>
      <div className="seat-head">
        <span className={`avatar ${player.isHuman ? 'human' : 'ai'}`} aria-hidden>
          {player.isHuman ? '◉' : '⌬'}
        </span>
        <div className="seat-meta">
          <strong title={player.name}>{player.name}</strong>
          <span className="seat-tags">
            {isCutter && <em className="chip chip-cut">KESEN</em>}
            {isStarter && <em className="chip chip-start">AÇAN</em>}
            {oneCard?.status === 'declared' && <em className="chip chip-one">TEK KART</em>}
          </span>
        </div>
      </div>
      <div className="seat-stats">
        <span title="Kalan kart">
          <b>{player.hand.length}</b> kart
        </span>
        <span title="Toplam puan">
          <b className="score">{player.totalScore}</b> puan
        </span>
      </div>
      <div className="seat-backs" aria-hidden>
        {Array.from({ length: shown }, (_, i) => (
          <CardView key={i} faceDown size="xs" />
        ))}
      </div>
      {canDeclare && (
        <button type="button" className="btn btn-one btn-sm" onClick={onDeclareOneCard}>
          TEK KART! {oneCardLeftMs != null ? `${Math.ceil(oneCardLeftMs / 1000)}s` : ''}
        </button>
      )}
      {/* Sabit yükseklikli bildirim alanı: mesaj gelince düzen kaymaz, kartların üzerine binmez. */}
      <div className="seat-notice-slot" aria-live="polite">
        {notice ? (
          <span key={notice.id} className={`seat-notice notice-${notice.kind}`}>
            {notice.text}
          </span>
        ) : thinking ? (
          <span className="seat-status is-thinking">
            Düşünüyor<span className="dots"><i>.</i><i>.</i><i>.</i></span>
          </span>
        ) : active ? (
          <span className="seat-status is-turn">SIRA</span>
        ) : null}
      </div>
    </div>
  );
}
