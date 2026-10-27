# PİS YEDİLİ // NEON

React, TypeScript ve Vite ile yazılmış, siberpunk temalı, tamamen oynanabilir **Pis Yedili** kart oyunu.
Arayüz tamamen Türkçedir; masaüstü ve mobilde çalışır.

- **Tek oyunculu:** sen + 3 yapay zekâ rakip
- **Yerel çok oyunculu:** aynı cihazda 2–4 koltuk; her koltuk insan ya da bot olabilir. Alt tarafta yalnızca sırası gelen insan oyuncunun eli açık görünür.
- 4 tur, en düşük toplam puan kazanır

## Kurulum ve çalıştırma

Gereksinim: Node.js 20 veya üstü (npm ile birlikte).

```bash
npm install
```

```bash
npm run dev
```

Tarayıcıda `http://localhost:5173` adresini aç.

| Komut | Açıklama |
| --- | --- |
| `npm run dev` | Geliştirme sunucusu |
| `npm test` | Vitest testlerini çalıştırır |
| `npm run build` | Tür denetimi (`tsc -b`) + üretim derlemesi (`dist/`) |
| `npm run preview` | Derlenmiş sürümü yerelde sunar |

## GitHub Pages'e dağıtım

`.github/workflows/deploy.yml`, `main` dalına her push'ta testleri çalıştırır, derler ve GitHub Pages'e yayınlar.

1. GitHub'da yeni bir depo oluştur (ör. `pis-yedili`).
2. Projeyi gönder:
   ```bash
   git init
   git add .
   git commit -m "Pis Yedili"
   git branch -M main
   git remote add origin https://github.com/<kullanıcı>/<repo>.git
   git push -u origin main
   ```
3. Depoda **Settings → Pages → Build and deployment → Source** alanını **GitHub Actions** yap.
4. **Actions** sekmesinde "GitHub Pages'e Dağıt" iş akışının yeşil bittiğini doğrula. Site:
   `https://<kullanıcı>.github.io/<repo>/`

**Vite base yolu:** `vite.config.ts`, `base` değerini `VITE_BASE_PATH` ortam değişkeninden alır.
İş akışı bunu otomatik olarak `/<repo-adı>/` yapar; depo adını değiştirsen bile ayar gerekmez.
Yerel `npm run build` varsayılan olarak `/pis-yedili/` kullanır; kökte sunmak için:

```bash
VITE_BASE_PATH=/ npm run build
```

Depo `<kullanıcı>.github.io` adlı bir kullanıcı sitesiyse iş akışındaki `VITE_BASE_PATH` değerini `/` yap.

## Kurallar (uygulandığı biçimiyle)

- 52 kartlık deste: Sinek ♣, Kupa ♥, Karo ♦, Maça ♠; her birinde A, 2–10, J, Q, K.
- Her oyuncu her turda 7 kart alır. Oyun 4 tur sürer.
- Üstteki kartla **aynı renk** ya da **aynı değerde** kart oynanır.
- Oynayamayan **tam 1 kart çeker**. Çekilen kart oynanabiliyorsa oynamak isteğe bağlıdır (yalnızca o kart oynanabilir; oynamazsa "Pas geç").
  Oynanabilir kartı olan oyuncu kart çekemez.
- **7:** sıradaki oyuncuya 4 kart ceza. O oyuncu bir 7 ile karşılık verebilir (ceza +4 birikir: 8, 12, …).
  Karşılık veremez ya da vermek istemezse biriken cezayı çeker ve sırasını kaybeder. Ceza varken yalnızca 7 oynanabilir.
- **As:** sıradaki oyuncu atlanır (2 kişilik oyunda As oynayan tekrar oynar).
- **Vale (J) — sembol seçme:** Vale her kartın üzerine atılabilir (bekleyen 7 cezasına karşı ve turun Sinek açılışında hariç). Vale atan oyuncu devam edilecek sembolü (Sinek/Kupa/Karo/Maça) seçer. Sıradaki oyuncu
  bu sembolde bir kart ya da başka bir Vale oynamalıdır; istek bir kart oynanana kadar geçerlidir. Seçim yapılana kadar
  kimse hamle yapamaz. Bot, elinde en çok kartı olan sembolü seçer (Valeler sayılmaz; eşitlikte puanı yüksek sembol).
- **Vale ile bitirme:** tur **son kart olarak Vale** ile bitirilirse sembol seçilmez, tur hemen biter ve rakiplerin
  o turdaki el puanları **ikiye katlanır**.
- **Tek kart:** elinde tek kart kalan oyuncu 5 sn içinde **TEK KART** butonuna basmalıdır; basmazsa eline **+2** kart
  eklenir (aynı durum için bir kez, sıra değişmez). **Son kartı atmadan önce bildirim şarttır:** denmeden son kart
  atılmaya çalışılırsa kart atılmaz, +2 ceza çekilir ve sıra normal kurallarla devam eder.
  Botlar bildirimi kendileri yapar.
- **Hamle süresi:** her sıra 20 sn'dir. Süre dolarsa oyuncu **1 kart çeker ve sırası geçer**; adına kart oynanmaz.
  Bekleyen 7 cezası varsa biriken ceza çekilir; Vale sonrası sembol seçilmediyse elindeki kartlara göre sembol seçilir. Kurallar penceresi açıkken süreler ve
  botlar durur.
- **Q ve K:** özel etki yok.
- **Puanlama:** A=11, 2–9 yüz değeri, 10/J/Q/K=10. Elini bitiren 0 puan alır.
- **Açılış:** turu başlatan oyuncu Sinek ile açmalıdır. Sineği yoksa Sinek bulana kadar desteden çeker, sonra bir Sinek oynar.
- **Biten deste:** açık yığının üst kartı dışındakiler karıştırılıp yeni deste yapılır. Hiç kart kalmazsa çekilebilen kadar
  çekilir; ceza da çekilebilen kadar uygulanır.

### Deste kesme (`resolveDeckCut()` — `src/game/deckCut.ts`)

Her turun başında deste karılır ve kapalı tutulur. **Kesen oyuncu** turdan tura döner (1. tur 1. oyuncu, 2. tur 2. oyuncu…).

1. Kesen oyuncu bir kesme noktası seçer (arayüzde 7–45). Üstteki o kadar kart elinde kalır.
2. Elindeki yarının **alt kartına** ve onun üstündeki kartlara bakar: alt karttan yukarı **en fazla 7 kartlık dizi**.
3. Bu dizide **J, A veya 7** varsa, alttan başlayan **4–7 ardışık kartı** alabilir (tek tek kart seçemez; yalnızca sayıyı seçer)
   ya da almamayı seçebilir.
4. Deste yeniden kurulur: masadaki alt yarı üste, elde kalan (alınmamış) kartlar alta. Kart kopyalanmaz/kaybolmaz.
5. Kartlar normal dağıtılır; kesen oyuncunun eli 7'ye tamamlanır.

#### Belgelenen belirsizlikler

Özel kural metni bazı noktaları açık bırakıyor. Kural sessizce değiştirilmedi; şu yorumlar seçildi:

| Belirsizlik | Seçilen yorum |
| --- | --- |
| "Elde kalan yarı" hangisi? | Kesmede kaldırılan **üst** yarı (deste dizisinde index `0..c-1`). |
| "İlgili dizi" ne kadar uzun? | Alt karttan yukarı **en fazla 7 kart** (alınabilecek en büyük blok). |
| Hak koşulu | Bu 7 kartlık dizide en az bir J, A veya 7 olması. Yalnızca alt kartın özel olması şart değil. |
| Hangi kartlar alınır? | Alt karttan başlayıp yukarı giden ardışık **k** kart (4 ≤ k ≤ 7). Elde k'dan az kart varsa o sayı sunulmaz. |
| Diziyi kim görür? | Yalnızca kesen oyuncu (yerel modda "cihazı devret" ekranıyla korunur). AI kesimini diğerleri görmez. |
| Deste nasıl birleşir? | Normal kesme gibi: `yeniDeste = alt yarı + elde kalan üst yarı`. |
| 2–3 oyunculu oyunda rotasyon | 4 tur olduğundan kesme hakkı sırayla tekrar eder (2 kişide herkes 2 kez kesiyor). |
| Turu kim başlatır? | Kesen oyuncunun bir sonrakisi. |

Diğer kural boşlukları için yapılan seçimler:

- Ceza kartı tükenen destede kalan kadar çekilir.
- Açılışta Sinek arayan oyuncu desteyi bitirirse açılış hakkı sıradaki oyuncuya geçer.
- Hiç kimse oynayamıyor ve çekilecek kart kalmamışsa (tüm oyuncular art arda pas), tur **kilitlenir**; herkes elindeki puanı alır.
- Toplam puanda eşitlik olursa birden fazla kazanan ilan edilir.

## Süre ayarları

Tüm süreler `src/config/timing.ts` içindeki `TIMING` nesnesinden değiştirilir:

| Ayar | Varsayılan | Anlamı |
| --- | --- | --- |
| `botThinkMinMs` / `botThinkMaxMs` | 2000 / 4000 | Bot hamlesinden önceki rastgele bekleme |
| `cardMoveMs` | 420 | Kart oynama/çekme hareketi |
| `panelNoticeMs` | 2200 | Oyuncu paneli bildirimi süresi |
| `roundEndDelayMs` | 2000 | Tur sonunda sonuç ekranından önceki bekleme |
| `turnMs` | 20000 | Hamle süresi |
| `oneCardWindowMs` | 5000 | "TEK KART" deme süresi |
| `botOneCardDelayMs` | 700 | Botun tek kart bildirimi gecikmesi |

Bot zamanlayıcısı her durum sürümü için tek bir hamle planlar; zamanlayıcı tetiklendiğinde durum değişmişse hamle
yapılmaz, böylece aynı bot iki kez oynayamaz.

## Mimari

```
src/
  game/            # Saf TypeScript, React'ten bağımsız
    types.ts       # Veri tipleri
    deck.ts        # Deste oluşturma, karıştırma, güvenli kart çekme
    rules.ts       # Hamle yasallığı, sıra, kesen/başlayan rotasyonu
    scoring.ts     # Kart/el değeri, tur puanları, kazanan
    deckCut.ts     # previewDeckCut() ve resolveDeckCut()
    engine.ts      # Durum makinesi: applyAction(state, action)
    ai.ts          # Yapay zekâ (yalnızca kendi eli + açık bilgi)
  config/timing.ts # Merkezi süre ayarları
  ui/seating.ts    # Koltuk yerleşimi (alt/sol/üst/sağ) ve alt koltukta kimin eli görünür
  hooks/useGame.ts # React durumu, bot zamanlayıcısı, 20 sn sayaç, tek kart süresi, duraklatma
  hooks/usePanelNotices.ts # Motor olaylarından oyuncu paneli bildirimleri
  components/      # Arayüz bileşenleri
  styles.css       # Siberpunk tema, animasyonlar, mobil düzen
tests/             # Vitest testleri
```

Motor değiştirilemez (immutable) durum döndürür; yasadışı her eylem `IllegalActionError` fırlatır.
Yapay zekâ `buildAiView()` ile yalnızca kendi elini, üst kartı, bekleyen cezayı ve rakiplerin **kart sayılarını** görür.

### Yapay zekâ stratejisi

- Ceza varsa elinde 7 bulunursa karşılık verir, yoksa cezayı alır.
- Çektiği kart oynanabiliyorsa oynar.
- Yüksek puanlı kartlardan erken kurtulur, elinde çok olan renge geçmeyi tercih eder.
- 7 ve As'ı, sıradaki rakip bitirmeye yakınken (≤2 kart) kullanır.
- Son iki kartından biri Vale ise Vale bitişi için onu saklar.
- Kesmede en çok özel kart içeren bloğu seçer.

## Testler

`npm test` şu alanları kapsar: Vale ile sembol seçimi, tek kart bildirimi ve +2 cezası, panel bildirim hedefleri,
koltuk düzeni, bot bekleme aralığı, deste bütünlüğü, geçerli hamleler, kart çekme, 7 cezası birikimi, As atlatma,
Vale bitişi, puanlama, deste kesme (yeniden kurma dahil), AI yasallığı (40 tam oyun simülasyonu, her adımda 52 kart denetimi),
tur tamamlama ve kilitlenme, biten deste.
