import type { Card, CutPreview, Rank } from './types';

/*
 * ÖZEL DESTE KESME KURALI
 * =======================
 * Kural metni: "Kesen oyuncu desteyi keser ve elinde kalan yarının alt kartına bakar.
 * İlgili dizide J, A veya 7 gibi özel değerler varsa, kart seçmeden ardışık 4–7 kartlık
 * bir diziyi alabilir. Eli gerekirse normal dağıtımla 7'ye tamamlanır."
 *
 * Kaçınılmaz belirsizlikler ve bu koddaki yorumlar (README'de de belgelenmiştir):
 *  1. "Elde kalan yarı": Deste dizisinde index 0 en üst karttır. Kesme noktası `c` ise
 *     kesen oyuncu üst yarıyı (index 0..c-1) kaldırır ve elinde tutar; alt yarı (c..51)
 *     masada kalır.
 *  2. "Alt kart": elde tutulan yarının en alttaki kartı, yani deck[c-1].
 *  3. "İlgili dizi": alt karttan başlayıp yukarı doğru giden en fazla 7 kart
 *     (deck[c-1], deck[c-2], …). Kural dizinin uzunluğunu belirtmediği için
 *     alınabilecek en büyük blok (7) esas alınmıştır.
 *  4. Hak koşulu: bu dizide en az bir J, A veya 7 bulunması. Koşul sağlanmazsa kart alınmaz.
 *  5. "Kart seçmeden": oyuncu tek tek kart seçemez; yalnızca bloğun uzunluğunu (4–7)
 *     seçer ve alttan itibaren ardışık blok alınır. Almamayı da seçebilir.
 *  6. Desteyi yeniden kurma: normal kesmede olduğu gibi alt yarı üste konur ve elde kalan
 *     (alınmamış) üst yarı onun altına eklenir: yeniDeste = deck[c..] + deck[0..c-k-1].
 *     Böylece hiçbir kart kopyalanmaz veya kaybolmaz (52 = k + yeniDeste.length).
 *  7. Kesme noktası 1..51 arasında olmalıdır; arayüz okunabilirlik için 7..45 aralığı sunar.
 */

export const SPECIAL_CUT_RANKS: Rank[] = ['J', 'A', '7'];
export const MIN_CLAIM = 4;
export const MAX_CLAIM = 7;
export const MIN_CUT = 7;
export const MAX_CUT = 45;

export interface DeckCutResolution {
  /** Kesen oyuncunun aldığı kartlar (alttan yukarı sırayla). */
  claimed: Card[];
  /** Yeniden kurulmuş deste (index 0 = en üst). */
  deck: Card[];
  preview: CutPreview;
}

export function previewDeckCut(deck: readonly Card[], cutPosition: number): CutPreview {
  if (!Number.isInteger(cutPosition) || cutPosition < 1 || cutPosition > deck.length - 1) {
    throw new Error(`Geçersiz kesme noktası: ${cutPosition}`);
  }
  const held = deck.slice(0, cutPosition);
  const bottomCard = held[held.length - 1];
  const sequence = held.slice(-MAX_CLAIM).reverse();
  const eligible = sequence.some((c) => SPECIAL_CUT_RANKS.includes(c.rank));
  const allowedCounts: number[] = [];
  if (eligible) {
    for (let k = MIN_CLAIM; k <= Math.min(MAX_CLAIM, held.length); k++) allowedCounts.push(k);
  }
  return { cutPosition, bottomCard, sequence, eligible: eligible && allowedCounts.length > 0, allowedCounts };
}

/**
 * Deste kesme kuralını çözer.
 * @param deck Karılmış, kapalı deste (index 0 = en üst).
 * @param cutPosition Kesme noktası (üst yarının kart sayısı).
 * @param claimCount Alınacak ardışık kart sayısı (4–7) ya da almamak için 0/null.
 */
export function resolveDeckCut(
  deck: readonly Card[],
  cutPosition: number,
  claimCount: number | null,
): DeckCutResolution {
  const preview = previewDeckCut(deck, cutPosition);
  const k = claimCount ?? 0;
  if (k !== 0 && !preview.allowedCounts.includes(k)) {
    throw new Error(`Bu kesmede ${k} kart alınamaz.`);
  }
  const held = deck.slice(0, cutPosition);
  const rest = deck.slice(cutPosition);
  const claimed = held.slice(held.length - k).reverse();
  const remainingHeld = held.slice(0, held.length - k);
  return { claimed: k === 0 ? [] : claimed, deck: [...rest, ...remainingHeld], preview };
}
