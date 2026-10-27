/**
 * Oyun temposu için MERKEZİ ayarlar. Bot bekleme süreleri, animasyonlar ve
 * bildirim süreleri yalnızca buradan değiştirilir (milisaniye).
 */
export const TIMING = {
  /** Bot hamlesinden önceki rastgele "düşünme" süresi: [min, max]. */
  botThinkMinMs: 2000,
  botThinkMaxMs: 4000,
  /** Kart oynama / çekme hareketinin süresi (300–500 ms önerilir). */
  cardMoveMs: 420,
  /** Önemli hamle bildirimi (7 cezası, As, Vale bitişi) görünme süresi. */
  noticeMs: 1100,
  /** Tur bittikten sonra sonuç ekranı açılmadan önceki bekleme. */
  roundEndDelayMs: 2000,
  /** Oyuncu paneli bildiriminin görünme süresi. */
  panelNoticeMs: 2200,
  /** Her oyuncunun hamle süresi. Dolarsa oyuncu adına kurallara uygun otomatik hamle yapılır. */
  turnMs: 20000,
  /** Elde tek kart kaldıktan sonra "TEK KART" demek için tanınan süre. */
  oneCardWindowMs: 5000,
  /** Botun elinde tek kart kaldığında bildirimi yapma gecikmesi. */
  botOneCardDelayMs: 700,
} as const;

export type Timing = typeof TIMING;

/** [min, max] aralığında rastgele bot bekleme süresi. */
export function randomBotDelay(rng: () => number = Math.random, timing: Timing = TIMING): number {
  const { botThinkMinMs: min, botThinkMaxMs: max } = timing;
  return Math.round(min + rng() * (max - min));
}
