import { describe, expect, it } from 'vitest';
import { chooseAction } from '../src/game/ai';
import { applyAction } from '../src/game/engine';
import { c, makePlayingState } from './helpers';

const base = () =>
  makePlayingState({
    hands: [
      [c('kupa', '2'), c('kupa', '5')],
      [c('kupa', '3'), c('maca', '4'), c('maca', '6')],
    ],
    discard: [c('kupa', '9')],
    drawPile: [c('karo', 'K'), c('karo', 'Q'), c('karo', '2')],
  });

describe('tek kart bildirimi', () => {
  it('elde tek kart kalınca bildirim penceresi açılır', () => {
    const n = applyAction(base(), { type: 'play', player: 0, cardId: 'kupa-2' });
    expect(n.players[0].hand).toHaveLength(1);
    expect(n.oneCard[0].status).toBe('open');
    expect(n.oneCard[1].status).toBe('none');
  });

  it('elde birden fazla kart varken bildirim yapılamaz', () => {
    expect(() => applyAction(base(), { type: 'declareOneCard', player: 0 })).toThrow();
  });

  it('zamanında bildirim yapılırsa ceza uygulanamaz; ikinci bildirim reddedilir', () => {
    let n = applyAction(base(), { type: 'play', player: 0, cardId: 'kupa-2' });
    const since = n.oneCard[0].since;
    n = applyAction(n, { type: 'declareOneCard', player: 0 });
    expect(n.oneCard[0].status).toBe('declared');
    expect(n.events.at(-1)).toMatchObject({ kind: 'oneCard', player: 0 });
    expect(() => applyAction(n, { type: 'declareOneCard', player: 0 })).toThrow();
    expect(() => applyAction(n, { type: 'oneCardPenalty', player: 0, since })).toThrow();
  });

  it('bildirim yapılmazsa +2 ceza yalnızca bir kez uygulanır ve sıra değişmez', () => {
    let n = applyAction(base(), { type: 'play', player: 0, cardId: 'kupa-2' });
    const since = n.oneCard[0].since;
    expect(n.currentPlayer).toBe(1);
    n = applyAction(n, { type: 'oneCardPenalty', player: 0, since });
    expect(n.players[0].hand).toHaveLength(3);
    expect(n.currentPlayer).toBe(1);
    expect(n.oneCard[0].status).toBe('none');
    expect(n.events.at(-1)).toMatchObject({ kind: 'penalty', player: 0 });
    expect(() => applyAction(n, { type: 'oneCardPenalty', player: 0, since })).toThrow();
  });

  it('TEK KART deyip son kartını atan oyuncu turu bitirir, ceza almaz', () => {
    let n = applyAction(base(), { type: 'play', player: 0, cardId: 'kupa-2' });
    const since = n.oneCard[0].since;
    n = applyAction(n, { type: 'declareOneCard', player: 0 });
    n = applyAction(n, { type: 'play', player: 1, cardId: 'kupa-3' });
    n = applyAction(n, { type: 'play', player: 0, cardId: 'kupa-5' });
    expect(n.phase).toBe('roundEnd');
    expect(n.roundResults[0].winnerId).toBe(0);
    expect(n.oneCard[0].status).toBe('none');
    expect(() => applyAction(n, { type: 'oneCardPenalty', player: 0, since })).toThrow();
  });

  it('TEK KART demeden son kart atılamaz: kart elde kalır, +2 ceza, sıra sürer', () => {
    let n = applyAction(base(), { type: 'play', player: 0, cardId: 'kupa-2' });
    n = applyAction(n, { type: 'play', player: 1, cardId: 'kupa-3' });
    n = applyAction(n, { type: 'play', player: 0, cardId: 'kupa-5' });
    expect(n.phase).toBe('playing');
    expect(n.discardPile.at(-1)!.id).toBe('kupa-3');
    expect(n.players[0].hand.map((x) => x.id)).toEqual(['kupa-5', 'karo-K', 'karo-Q']);
    expect(n.currentPlayer).toBe(0);
    expect(n.events.at(-1)).toMatchObject({ kind: 'penalty', player: 0 });
    // Ceza sonrası normal oynamaya devam eder.
    n = applyAction(n, { type: 'play', player: 0, cardId: 'kupa-5' });
    expect(n.currentPlayer).toBe(1);
  });

  it('bot son kartını atmadan önce TEK KART der', () => {
    let n = applyAction(base(), { type: 'play', player: 0, cardId: 'kupa-2' });
    n = applyAction(n, { type: 'play', player: 1, cardId: 'kupa-3' });
    expect(chooseAction(n, 0)).toEqual({ type: 'declareOneCard', player: 0 });
  });

  it('eski bir pencerenin cezası yeni tek kart durumuna uygulanmaz', () => {
    let n = applyAction(base(), { type: 'play', player: 0, cardId: 'kupa-2' });
    const oldSince = n.oneCard[0].since;
    n = applyAction(n, { type: 'oneCardPenalty', player: 0, since: oldSince });
    expect(n.players[0].hand).toHaveLength(3);
    // Kart sayısı yeniden 1'e düşerse yeni bir pencere açılır; eski "since" ile ceza verilemez.
    const back = { ...n, players: n.players.map((p, i) => (i === 0 ? { ...p, hand: [c('kupa', '5')] } : p)) };
    const reopened = applyAction(back, { type: 'play', player: 1, cardId: 'kupa-3' });
    expect(reopened.oneCard[0].status).toBe('open');
    expect(reopened.oneCard[0].since).not.toBe(oldSince);
    expect(() => applyAction(reopened, { type: 'oneCardPenalty', player: 0, since: oldSince })).toThrow();
  });
});

describe('panel bildirimleri', () => {
  it('7 cezası, As ve Vale olayları ilgili oyuncunun paneline yönlenir', () => {
    const s = makePlayingState({
      hands: [
        [c('kupa', '7'), c('kupa', 'A'), c('kupa', 'J'), c('kupa', '2')],
        [c('maca', '3')],
        [c('karo', '4')],
      ],
      discard: [c('kupa', '9')],
      drawPile: [c('sinek', '2'), c('sinek', '3'), c('sinek', '4'), c('sinek', '5')],
    });
    const seven = applyAction(s, { type: 'play', player: 0, cardId: 'kupa-7' });
    expect(seven.events.at(-1)).toMatchObject({ kind: 'penalty', player: 1 });
    const taken = applyAction(seven, { type: 'acceptPenalty', player: 1 });
    expect(taken.events.at(-1)).toMatchObject({ kind: 'penalty', player: 1, text: '+4 KART ÇEKİLDİ' });

    const ace = applyAction(s, { type: 'play', player: 0, cardId: 'kupa-A' });
    expect(ace.events.at(-1)).toMatchObject({ kind: 'skip', player: 1, text: 'SIRA ATLANDI' });

    let jack = applyAction(s, { type: 'play', player: 0, cardId: 'kupa-J' });
    jack = applyAction(jack, { type: 'chooseSuit', player: 0, suit: 'maca' });
    expect(jack.events.at(-1)).toMatchObject({ kind: 'suit', player: 0 });
    expect(jack.events.at(-1)!.text).toContain('MAÇA');
  });
});
