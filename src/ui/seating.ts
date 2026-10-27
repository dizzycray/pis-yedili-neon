import type { GameState } from '../game/types';

export type SeatPosition = 'bottom' | 'left' | 'top' | 'right';

export interface Seat {
  playerId: number;
  position: SeatPosition;
}

/**
 * Oyuncuları masanın kenarlarına yerleştirir. İzleyen oyuncu her zaman alttadır;
 * diğerleri oyun sırasına göre saat yönünde (sol → üst → sağ) dizilir.
 */
export function getSeats(playerCount: number, viewer: number): Seat[] {
  const order: Record<number, SeatPosition[]> = {
    2: ['bottom', 'top'],
    3: ['bottom', 'left', 'right'],
    4: ['bottom', 'left', 'top', 'right'],
  };
  const positions = order[playerCount] ?? order[4];
  return positions.map((position, offset) => ({
    playerId: (viewer + offset) % playerCount,
    position,
  }));
}

/**
 * Alt koltukta kimin kartlarının açık gösterileceği.
 * - Tek insan oyuncu: her zaman o oyuncu.
 * - Birden çok insan (aynı cihaz): hamle sırası olan insan oyuncu; sıra bottaysa
 *   en son oynayan insan oyuncu alt koltukta kalır (kartları gizlenmez ama başka
 *   kimsenin kartı açılmaz).
 */
export function resolveViewer(state: GameState, lastViewer: number | null): number {
  const humans = state.players.filter((p) => p.isHuman);
  if (humans.length === 0) return 0;
  if (humans.length === 1) return humans[0].id;
  const actor =
    state.phase === 'cut' ? state.cutterIndex : state.phase === 'playing' ? state.currentPlayer : null;
  if (actor !== null && state.players[actor].isHuman) return actor;
  return lastViewer ?? humans[0].id;
}
