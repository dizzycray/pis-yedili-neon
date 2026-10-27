import { TIMING } from '../config/timing';
import { MAX_CLAIM, MIN_CLAIM } from '../game/deckCut';
import { ONE_CARD_PENALTY } from '../game/engine';
import { HAND_SIZE, SEVEN_PENALTY, TOTAL_ROUNDS } from '../game/rules';

const sec = (ms: number) => Math.round(ms / 1000);

/** Kural metni. Sayılar doğrudan motor ve zamanlama sabitlerinden gelir. */
export function RulesContent() {
  return (
    <div className="rules-content">
      <section>
        <h3>Amaç ve Oyun Yapısı</h3>
        <ul>
          <li>
            Oyun <b>{TOTAL_ROUNDS} tur</b> sürer. Her turda herkes <b>{HAND_SIZE} kartla</b> başlar.
          </li>
          <li>Elini ilk bitiren turu kazanır ve o turdan 0 puan alır; diğerleri elinde kalan kartların puanını alır.</li>
          <li>
            {TOTAL_ROUNDS} turun sonunda <b>toplam puanı en düşük</b> olan oyunu kazanır.
          </li>
        </ul>
      </section>

      <section>
        <h3>Kart Oynama</h3>
        <ul>
          <li>
            Açık kartla <b>aynı sembolde</b> (renk) ya da <b>aynı değerde</b> bir kart oynanır.
          </li>
          <li>
            Turu başlatan oyuncu <b>Sinek</b> ile açar. Sineği yoksa Sinek bulana kadar desteden çeker.
          </li>
          <li>
            Oynayacak kartın yoksa desteden <b>1 kart</b> çekersin. Çektiğin kart uyuyorsa oynayabilir ya da pas
            geçebilirsin. Oynanabilir kartın varken kart çekemezsin.
          </li>
          <li>Deste biterse açık yığın (üstteki kart hariç) karıştırılıp yeni deste yapılır.</li>
        </ul>
      </section>

      <section>
        <h3>Özel Kartlar</h3>
        <ul>
          <li>
            <b>7 — Ceza:</b> sıradaki oyuncu {SEVEN_PENALTY} kart cezası alır. O oyuncu başka bir 7 ile karşılık
            verirse ceza {SEVEN_PENALTY} artarak bir sonrakine geçer ({SEVEN_PENALTY}, {SEVEN_PENALTY * 2},{' '}
            {SEVEN_PENALTY * 3}…). Karşılık veremeyen ya da vermek istemeyen biriken cezayı çeker ve sırasını kaybeder.
          </li>
          <li>
            <b>As — Sıra atlatma:</b> sıradaki oyuncunun sırası atlanır. İki kişilik oyunda As oynayan tekrar oynar.
          </li>
          <li>
            <b>Vale — Sembol değiştirme:</b> Vale <b>her kartın üzerine</b> atılabilir (yalnızca bekleyen 7
            cezasına karşı ve turun ilk kartı olarak kullanılamaz; açılış Sinek ile yapılır). Vale atan oyuncu Sinek, Kupa, Karo veya Maça arasından devam edilecek
            sembolü seçer. Sıradaki oyuncu bu sembolde bir kart ya da başka bir Vale oynamalıdır. Seçim yapılana kadar
            kimse hamle yapamaz.
          </li>
          <li>
            <b>Vale ile bitirme:</b> son kartın Vale ise tur hemen biter, sembol seçilmez ve rakiplerin o turdaki
            puanları <b>ikiye katlanır</b>.
          </li>
          <li>Kız (Q) ve Papaz (K) özel etkiye sahip değildir.</li>
        </ul>
      </section>

      <section>
        <h3>Tek Kart Bildirimi</h3>
        <ul>
          <li>
            Elinde <b>tek kart</b> kaldığında <b>TEK KART</b> butonuna basmalısın. Bunun için{' '}
            <b>{sec(TIMING.oneCardWindowMs)} saniyen</b> var; buton yalnızca elinde bir kart varken çalışır.
          </li>
          <li>
            Süre içinde bildirmezsen eline <b>+{ONE_CARD_PENALTY} ceza kartı</b> eklenir. Ceza aynı durum için yalnızca
            bir kez uygulanır ve sıra düzeni değişmez.
          </li>
          <li>
            <b>Son kartını atmadan önce TEK KART demek şarttır.</b> Demeden son kartı atmaya çalışırsan kart atılmaz,{' '}
            <b>+{ONE_CARD_PENALTY} ceza kartı</b> çekersin ve sıran normal kurallarla devam eder.
          </li>
          <li>TEK KART dedikten sonra son kartını atıp elini bitirirsen ceza uygulanmaz.</li>
          <li>Botlar elinde tek kart kaldığında bildirimi kendileri yapar.</li>
        </ul>
      </section>

      <section>
        <h3>Hamle Süresi</h3>
        <ul>
          <li>
            Her oyuncunun sırası başladığında <b>{sec(TIMING.turnMs)} saniyelik</b> sayaç başlar; kalan süre masanın
            ortasında görünür.
          </li>
          <li>
            Süre dolarsa <b>1 kart çekersin ve sıran geçer</b>; senin adına kart oynanmaz (oynanabilir kartın olsa
            bile). Bekleyen bir 7 cezası varsa biriken ceza çekilir. Vale attıktan sonra sembol seçmediysen elindeki
            kartlara göre sembol seçilir ve sıra geçer.
          </li>
          <li>Kurallar penceresi açıkken sayaçlar ve botlar bekler.</li>
        </ul>
      </section>

      <section>
        <h3>Puanlama</h3>
        <ul>
          <li>As = 11 · 2–9 = kartın sayısı · 10, Vale, Kız, Papaz = 10</li>
          <li>Kimse oynayamıyor ve çekilecek kart kalmamışsa tur kilitlenir; herkes elindeki puanı alır.</li>
        </ul>
      </section>

      <section>
        <h3>Deste Kesme</h3>
        <ul>
          <li>Her turun başında sırayla bir oyuncu desteyi keser ve elinde kalan yarının alt kartlarına bakar.</li>
          <li>
            Alttaki 7 kartlık dizide J, A veya 7 varsa alttan başlayarak ardışık <b>{MIN_CLAIM}–{MAX_CLAIM} kart</b>{' '}
            alabilir (tek tek kart seçemez) ya da almamayı seçebilir. Eli dağıtımla {HAND_SIZE} karta tamamlanır.
          </li>
          <li>Kesen oyuncunun solundaki oyuncu turu başlatır.</li>
        </ul>
      </section>
    </div>
  );
}

interface OverlayProps {
  /** 'start': yeni oyun başında, 'help': oyun sırasında / menüden. */
  mode: 'start' | 'help';
  onClose: () => void;
  hotseatNames?: string[];
}

export function RulesOverlay({ mode, onClose, hotseatNames }: OverlayProps) {
  return (
    <div className="overlay rules-overlay">
      <div className="panel modal rules-modal" role="dialog" aria-label="Oyun Kuralları">
        <h2 className="neon-title">OYUN KURALLARI</h2>
        {mode === 'start' && hotseatNames && hotseatNames.length > 1 && (
          <p className="hotseat-note">
            Aynı cihazda oynuyorsunuz ({hotseatNames.join(', ')}). Alt tarafta yalnızca sırası gelen oyuncunun kartları
            açık görünür; sıra sana geldiğinde cihazı al.
          </p>
        )}
        <div className="rules-scroll">
          <RulesContent />
        </div>
        <button className="btn btn-primary btn-big" onClick={onClose} autoFocus>
          {mode === 'start' ? 'ANLADIM, OYUNA BAŞLA' : 'KAPAT VE DEVAM ET'}
        </button>
      </div>
    </div>
  );
}
