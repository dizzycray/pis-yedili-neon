import type { PlayerConfig } from './types';

/**
 * Masanın üç sabit bot oyuncusu. Her yeni oyunda ve "Yeniden Oyna"da aynı adlar
 * aynı sırayla kullanılır; oyuncular rakiplerini tanır.
 */
export const BOT_NAMES = ['Neon Necla', 'Krom Kemal', 'Piksel Pakize'] as const;

/**
 * Adı boş bırakılmış botlara sırasıyla sabit adları verir. İnsan oyuncuların ve elle
 * ad yazılmış botların adları aynen kalır. Bir insan oyuncu bir bot adını almışsa
 * o ad atlanır, böylece masada aynı ad iki kez görünmez.
 */
export function withBotNames(configs: PlayerConfig[]): PlayerConfig[] {
  const isAuto = (c: PlayerConfig) => !c.isHuman && !c.name.trim();
  const taken = new Set(configs.filter((c) => !isAuto(c)).map((c) => c.name.trim().toLocaleLowerCase('tr')));
  const available = BOT_NAMES.filter((n) => !taken.has(n.toLocaleLowerCase('tr')));
  let i = 0;
  return configs.map((c) => (isAuto(c) ? { ...c, name: available[i++] ?? `Bot ${i}` } : c));
}
