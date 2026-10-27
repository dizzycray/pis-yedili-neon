import { useEffect, useRef, useState } from 'react';
import { TIMING } from '../config/timing';
import type { GameEvent, GameState } from '../game/types';

export type PanelNotice = Required<Pick<GameEvent, 'kind' | 'text' | 'id'>>;

/**
 * Motorun olay listesinden oyuncu panellerine gidecek kısa bildirimleri üretir.
 * Her oyuncunun panelinde en son olayı gösterir ve bir süre sonra kaldırır.
 * Aynı render'da birden fazla olay gelse bile hiçbiri kaçmaz (olay numarasıyla izlenir).
 */
export function usePanelNotices(state: GameState): Record<number, PanelNotice> {
  const [notices, setNotices] = useState<Record<number, PanelNotice>>({});
  const lastSeen = useRef(state.events.at(-1)?.id ?? 0);
  const timers = useRef<Record<number, number>>({});

  useEffect(() => {
    const fresh = state.events.filter((e) => (e.id ?? 0) > lastSeen.current && e.player != null);
    lastSeen.current = Math.max(lastSeen.current, state.events.at(-1)?.id ?? 0);
    if (!fresh.length) return;
    setNotices((prev) => {
      const next = { ...prev };
      for (const e of fresh) next[e.player!] = { kind: e.kind, text: e.text, id: e.id! };
      return next;
    });
    for (const e of fresh) {
      const player = e.player!;
      window.clearTimeout(timers.current[player]);
      timers.current[player] = window.setTimeout(() => {
        setNotices((prev) => {
          if (prev[player]?.id !== e.id) return prev;
          const next = { ...prev };
          delete next[player];
          return next;
        });
      }, TIMING.panelNoticeMs);
    }
  }, [state.events]);

  useEffect(() => () => Object.values(timers.current).forEach((t) => window.clearTimeout(t)), []);

  return notices;
}
