import { describe, expect, it } from 'vitest';
import { TIMING, randomBotDelay } from '../src/config/timing';
import { applyAction } from '../src/game/engine';
import { getSeats, resolveViewer } from '../src/ui/seating';
import { c, makePlayingState } from './helpers';

describe('koltuk düzeni', () => {
  it('4 oyuncuda izleyen altta, diğerleri sol-üst-sağ sırasında', () => {
    expect(getSeats(4, 0)).toEqual([
      { playerId: 0, position: 'bottom' },
      { playerId: 1, position: 'left' },
      { playerId: 2, position: 'top' },
      { playerId: 3, position: 'right' },
    ]);
    expect(getSeats(4, 2).map((s) => s.playerId)).toEqual([2, 3, 0, 1]);
    expect(getSeats(2, 1).map((s) => s.position)).toEqual(['bottom', 'top']);
    expect(getSeats(3, 0).map((s) => s.position)).toEqual(['bottom', 'left', 'right']);
  });

  it('tek insanlı oyunda alttaki el hep insanındır; aynı cihazda sıradaki insanındır', () => {
    const single = makePlayingState({ hands: [[c('kupa', '2')], [c('kupa', '3')]], current: 1 });
    expect(resolveViewer(single, null)).toBe(0);

    const hot = makePlayingState({ hands: [[c('kupa', '2')], [c('kupa', '3')], [c('kupa', '4')]], current: 2 });
    const humans = { ...hot, players: hot.players.map((p, i) => ({ ...p, isHuman: i !== 1 })) };
    expect(resolveViewer(humans, 0)).toBe(2);
    // Sıra bottayken son insan izleyici korunur, botun eli asla açılmaz.
    expect(resolveViewer({ ...humans, currentPlayer: 1 }, 2)).toBe(2);
  });
});

describe('zamanlama ayarları', () => {
  it('bot bekleme süresi merkezi ayardaki 2–4 sn aralığında', () => {
    expect(TIMING.botThinkMinMs).toBe(2000);
    expect(TIMING.botThinkMaxMs).toBe(4000);
    expect(randomBotDelay(() => 0)).toBe(2000);
    expect(randomBotDelay(() => 0.999999)).toBe(4000);
    for (let i = 0; i < 100; i++) {
      const d = randomBotDelay();
      expect(d).toBeGreaterThanOrEqual(2000);
      expect(d).toBeLessThanOrEqual(4000);
    }
    expect(TIMING.cardMoveMs).toBeGreaterThanOrEqual(300);
    expect(TIMING.cardMoveMs).toBeLessThanOrEqual(500);
  });

  it('her hamle benzersiz bir sürüm üretir (zamanlayıcının çift hamle koruması buna dayanır)', () => {
    const s = makePlayingState({
      hands: [[c('kupa', '2'), c('kupa', '5')], [c('kupa', '3'), c('kupa', '6')]],
      discard: [c('kupa', '9')],
    });
    const a = applyAction(s, { type: 'play', player: 0, cardId: 'kupa-2' });
    expect(a.version).toBeGreaterThan(s.version);
    expect(a.lastMove).toMatchObject({ kind: 'play', player: 0, count: 1 });
    // Aynı bot eylemi eski duruma göre tekrar uygulanırsa sıra artık onda olmadığı için reddedilir.
    expect(() => applyAction(a, { type: 'play', player: 0, cardId: 'kupa-5' })).toThrow();
  });
});
