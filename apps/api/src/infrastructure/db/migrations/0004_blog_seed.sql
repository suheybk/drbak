-- 0004_blog_seed.sql — populates the launch blog post set.
--
-- Matches `marketing/content-calendar.csv` rows marked status=`drafted` for
-- TR + EN at weeks T-1 → T+1. AR/FR/ES translations are deferred until the
-- medical translator review (see B1 in LAUNCH-CHECKLIST.md).
--
-- Voice constraints — strictly enforced per `dr-bak-locked-decisions.md`:
--   - Never: mucize, garantili, %100 başarı, Türkiye'nin en iyisi, son teknoloji,
--     miracle cure, guaranteed result
--   - 60% formal, 50/50 clinical/warm, 60% authoritative, 80% restrained, 60% hopeful
--   - Evidence-anchored; no claims without a clinical scaffold behind them
--
-- Owner approval: Dr. Oğuz Bak should review the medical statements before
-- the blog goes live; he can adjust the body via the admin CMS without a
-- migration. The seed is a defensible starting point.

INSERT INTO content_entries (id, type, slug, status, published_at) VALUES
  ('ce_blog_tms_nedir',                'blog', 'tms-nedir',                  'published', now()),
  ('ce_blog_migren_tms',               'blog', 'migren-tms',                 'published', now()),
  ('ce_blog_tedaviye_direncli_dep',    'blog', 'tedaviye-direncli-depresyon','published', now()),
  ('ce_blog_noropatik_agri_tedavi',    'blog', 'noropatik-agri-tedavi',      'published', now()),
  ('ce_blog_glutatyon_iv',             'blog', 'glutatyon-iv',               'published', now()),
  ('ce_blog_epilepsi_vs_nobet',        'blog', 'epilepsi-vs-nobet',          'published', now())
ON CONFLICT (id) DO NOTHING;

-- ─── TR canonicals ────────────────────────────────────────────────────────────

INSERT INTO content_entry_translations (
  content_entry_id, locale, title, lead_paragraph, body_markdown,
  doctor_note_markdown, slug_localised, reading_minutes, meta_description
) VALUES

-- 1) TMS Nedir? Mekanizma ve Klinik Kullanım
('ce_blog_tms_nedir', 'tr',
 'TMS Nedir? Mekanizma ve Klinik Kullanım',
 'Transkraniyal manyetik uyarım (TMS), saç derisinden uygulanan kısa süreli manyetik alanlarla beynin belirli bölgelerinde nöral aktiviteyi düzenleyen, ilaçsız bir tedavi yöntemidir.',
 'Transkraniyal manyetik uyarım (Transcranial Magnetic Stimulation, TMS), bir bobin aracılığıyla saç derisinden geçen değişken manyetik alanın altındaki kortikal nöronlarda elektrik akımı oluşturmasına dayanır. Akım, hedef bölgenin uyarılabilirliğini protokole göre artırır veya azaltır.

## Tarihçe ve regülasyon
TMS''in klinik kullanımı 1985''te Anthony Barker''ın ilk insan uygulamasıyla başlamıştır. ABD FDA, depresyon endikasyonunda 2008''de, OKB endikasyonunda 2018''de derin TMS (dTMS) protokollerine onay vermiştir. Migren ve sigara bırakmada da onaylı uygulamalar bulunmaktadır.

## Nasıl uygulanır?
- Hasta uyanık ve oturur pozisyondadır; sedasyon gerekmez.
- Bobin, hedef bölgenin (ör. sol dorsolateral prefrontal korteks) üstüne yerleştirilir.
- Bir seans çoğunlukla 20–40 dakikadır; kür planı tipik olarak 4–6 hafta, haftada 5 seansla yürütülür.
- Seans sonrası hasta günlük yaşamına döner; araç kullanmasında sakınca yoktur.

## Hangi durumlarda değerlendirilir?
- Tedaviye dirençli majör depresyon
- Obsesif-kompulsif bozukluk (OKB)
- Migrende koruyucu tedaviye yanıt vermeyen olgular
- Anksiyete bozukluklarına eşlik eden depresif tablolar
- İnme sonrası rehabilitasyon (motor ve dil)
- Nöropatik ağrı sendromları (seçilmiş protokoller)

Her endikasyon için kanıt düzeyi farklıdır; hangi protokolün uygun olduğu klinik değerlendirme sonrası belirlenir.

## Güvenlik ve kontrendikasyonlar
TMS, sedasyon gerektirmemesi ve sistemik yan etki profilinin sınırlı olması nedeniyle birçok hastada iyi tolere edilir. Yine de bazı durumlar uygulama için engel oluşturur:

- Kafa içinde manyetik veya elektronik implant (kalp pili dışı dahil)
- Aktif epilepsi / yüksek nöbet riski (ilaç eşiği düşürücü tedavi alanlar dahil)
- Gebelik (kanıt sınırlı; risk-yarar değerlendirmesi)
- Kontrolsüz psikiyatrik dekompansasyon

Tedavi öncesi mutlak bir ön tarama formu doldurulur; bu form 365 gün geçerlidir.

## Beklentiler
TMS, tek başına bir tedavi olmaktan çok klinik plan içinde değerlendirilen bir araçtır. Yanıt oranı endikasyona ve protokole göre değişir; depresyonda klinik çalışmalarda hastaların önemli bir kısmı belirgin iyileşme bildirir. Tek seansla sonuç beklenmez; kürün tamamı ve sonrasındaki idame planı birlikte değerlendirilir.',
 'TMS''i bir alet olarak değil, planın bir parçası olarak gördüğümüzde en doğru kararı veriyoruz. Hangi durumda işe yarar, hangi durumda yetmez, ne zaman ilaca veya psikoterapiye ihtiyaç duyarız — bunları birlikte konuşmak en başta yapılması gerekendir.',
 'tms-nedir', 6,
 'Transkraniyal manyetik uyarım (TMS): mekanizma, endikasyonlar, güvenlik ve gerçekçi beklentiler. Klinik bilgi.'),

-- 2) Migren ve TMS: Klinik Yaklaşım
('ce_blog_migren_tms', 'tr',
 'Migren ve TMS: Klinik Yaklaşım',
 'Migrende TMS, koruyucu ilaç tedavilerine yanıt vermeyen ya da bu tedavileri tolere edemeyen hastalarda değerlendirilebilen, ilaçsız bir destek seçeneğidir.',
 'Migren, sıradan bir baş ağrısı değildir; tek taraflı, zonklayıcı, ışık ve sese duyarlılığın eşlik ettiği, hastanın günlük işlevini belirgin biçimde etkileyen nörolojik bir durumdur. Tedavinin iki ekseni vardır: atak tedavisi ve koruyucu tedavi.

## Klasik tedavi seçenekleri
- Atak tedavisi: triptanlar, NSAİİ''ler, gerektiğinde antiemetikler
- Koruyucu tedavi: beta-blokerler (propranolol), antikonvülzanlar (topiramat), antidepresanlar (amitriptilin), CGRP antagonistleri (yeni nesil)
- Davranışsal: tetikleyici takibi, uyku düzeni, kafein/alkol farkındalığı

Bu tedaviler birçok hastada yeterlidir. Bir alt grup hasta ise yeterli süre ve dozda denenmiş koruyucu tedaviye yanıt vermez ya da yan etkilerini tolere edemez.

## TMS''in yeri
ABD FDA, migren atak tedavisinde tek darbe TMS (single-pulse TMS) cihazını 2013''te onaylamıştır. Klinik çalışmalarda atağın erken döneminde uygulanan tek darbe TMS, ağrı şiddetini azaltabildiği gibi atağı sonlandırabilir. Koruyucu kullanım ise tekrarlayan TMS (rTMS) protokolleriyle araştırma alanındadır.

## Kimler için uygun olabilir?
- Aurali ya da aurasız migrende, koruyucu ilaç tedavisinin yan etkilerini tolere edemeyen olgular
- Gebelik veya laktasyon nedeniyle ilaç seçenekleri kısıtlanan olgular
- Atakların sıklığı ayda 4''ten fazla olan ve klasik tedaviye dirençli olgular

## Beklentiler ve sınırlamalar
TMS, migreni "iyileştiren" bir yöntem olarak değil, atak yönetimi ve sıklığı için bir araç olarak konumlandırılır. Klinik yanıt hasta bazında değişir; bir kısım hastada belirgin fayda görülürken bir kısımda fayda sınırlıdır. Klasik tedavi ile birlikte uygulanmasının uygun olup olmadığı her hasta için ayrı değerlendirilir.

## Klinik değerlendirme süreci
- Detaylı baş ağrısı öyküsü (sıklık, süre, şiddet, tetikleyici, eşlik eden semptomlar)
- Önceki tedavilerin gözden geçirilmesi (hangi ilaç, ne kadar süre, hangi yan etki nedeniyle bırakıldı)
- TMS ön tarama formu (kafa içi metal, nöbet öyküsü)
- Birlikte hedef belirleme: atak şiddetini düşürmek mi, atak sıklığını azaltmak mı, ilaç dozunu mu azaltmak istiyoruz?',
 'Migren tedavisinde tek bir araç tüm hastalara uymaz; hangi aracın hangi sırayla denendiği plan kadar önemlidir. TMS''i değerlendirmeye almadan önce mevcut koruyucu tedavinizin ne kadar süredir, hangi dozda ve neden bırakıldığını birlikte gözden geçiriyoruz.',
 'migren-tms', 5,
 'Migrende TMS uygulaması: kimler için uygundur, FDA onaylı kullanım alanları, gerçekçi klinik beklentiler.'),

-- 3) Tedaviye Dirençli Depresyon: Yeni Seçenekler
('ce_blog_tedaviye_direncli_dep', 'tr',
 'Tedaviye Dirençli Depresyon: Yeni Seçenekler',
 'En az iki uygun antidepresan tedavisine yeterli süre ve dozda yanıt vermeyen depresyon, tedaviye dirençli depresyon olarak tanımlanır. Bu noktada TMS, ketamin/esketamin ve nöromodülasyon seçenekleri birlikte değerlendirilebilir.',
 'Depresyon tedavisinde ilk basamak çoğunlukla seçici serotonin geri alım inhibitörleri (SSRI) veya benzer bir antidepresan ile psikoterapinin birleştirilmesidir. Hastaların önemli bir kısmı bu yaklaşımla iyileşir. Bir alt grup hasta ise tedaviye dirençli depresyon (TRD) tablosu sergiler.

## Tedaviye dirençli depresyon nedir?
Klinik tanımı: en az iki farklı sınıftan, yeterli dozda, en az 6 hafta süreyle uygulanmış antidepresan denemesine rağmen klinik düzelmenin sağlanamaması. "Yetersiz deneme" sıkça karıştırılan bir durumdur — düşük doz, kısa süre veya hasta uyumsuzluğu nedeniyle ilaç gerçekte test edilmemiş olabilir. Bu yüzden TRD tanımlaması koymak kendi başına bir klinik değerlendirme sürecidir.

## Mevcut seçenekler
Bir hasta gerçekten TRD kategorisindeyse, birkaç seçenek değerlendirme tabağında bulunur:

### 1. Augmentasyon stratejileri
Mevcut antidepresana ikinci bir ilaç eklemek: lityum, atipik antipsikotik (ör. ketiapin, aripiprazol), tiroid hormonu (T3). Bu seçenekler kanıt düzeyi yüksek ve göz ardı edilmemesi gerekenlerdir.

### 2. Transkraniyal manyetik uyarım (TMS)
ABD FDA, depresyon endikasyonunda TMS''i 2008''de onaylamıştır. Klinik çalışmalarda TRD hastalarının önemli bir kısmı 4–6 haftalık kürlerde belirgin iyileşme bildirir. Tedavi sırasında ilaçların bırakılması gerekmez; protokol mevcut tedaviyle entegre edilebilir.

### 3. Esketamin (intranazal)
NMDA reseptör antagonisti olan esketamin, ABD FDA tarafından TRD endikasyonunda onaylanmıştır. Türkiye''de erişim koşulları ve mevzuat farklıdır; her hasta için uygun olmayabilir.

### 4. Elektrokonvülzif tedavi (EKT)
EKT, ciddi ya da yaşamı tehdit eden depresif tablolarda halen en yüksek yanıt oranlarına sahip tedavidir. Yeni jenerasyon EKT protokolleri eski dönemlerin yan etki profilinden belirgin biçimde daha hafiftir.

### 5. Psikoterapi
Bilişsel-davranışçı terapi, kabul ve kararlılık terapisi, kişilerarası terapi — bunlar TRD''de "ilave" değil, omurga olarak konumlanır. Tek başına ilaca yanıt vermeyen hasta, terapi + ilaç + nöromodülasyon kombinasyonuyla yanıt verebilir.

## Karar nasıl verilir?
- Önceki tedavilerin gerçekten yeterli olup olmadığı
- Hastanın eş zamanlı tıbbi durumu (epilepsi öyküsü, kalp pili, kafa içi metal — TMS için sorgulanır)
- Sosyal destek ve takip imkânı
- Hasta tercihi (oral ilaç mı, klinikte uygulama mı, sedasyon kabul edilebilir mi)

## Beklenti yönetimi
Tedaviye dirençli depresyonda hızlı çözüm vaadi gerçekçi değildir. Bir kürün ardından kısmi yanıt almak da bir başarıdır ve sonraki adımı daha doğru planlamamızı sağlar. Yanıt alınmaması, "umut yok" demek değil, "bu protokolle bu doz/süre yeterli olmadı" demektir.',
 'Tedaviye dirençli depresyon tanısını koymak ile bu tanıyı kabullenmek farklı şeylerdir. Çoğu zaman doz veya süre yeterli olmadığı için "dirençli" görünen bir tablo, doğru optimizasyonla yeniden değerlendirilebilir.',
 'tedaviye-direncli-depresyon', 7,
 'Tedaviye dirençli depresyonda TMS, esketamin, EKT ve augmentasyon seçenekleri. Klinik karar süreci.'),

-- 4) Nöropatik Ağrı: Tanı ve Tedavi Yaklaşımları
('ce_blog_noropatik_agri_tedavi', 'tr',
 'Nöropatik Ağrı: Tanı ve Tedavi Yaklaşımları',
 'Nöropatik ağrı, sinir sisteminin kendisindeki hasar veya işlev bozukluğundan kaynaklanan kronik bir ağrı tipidir. Klasik analjeziklerle yanıt sınırlıdır; tedavi planı çok bileşenlidir.',
 'Nöropatik ağrı, periferik veya santral sinir sisteminin doğrudan etkilenmesi sonucu ortaya çıkan ağrı tablosudur. Yanma, batma, elektriklenme, soğuk uyaranı sıcak hissedilmesi (allodini), normalde ağrı yapmayan dokunmanın ağrılı olması gibi tipik özellikleri vardır.

## Sık görülen nedenler
- Diyabetik periferik nöropati (en yaygın grup)
- Postherpetik nevralji (zona sonrası kalıcı ağrı)
- Trigeminal nevralji
- Karpal tünel sendromu
- Kemoterapi sonrası periferik nöropati
- Multipl skleroz, inme, omurilik yaralanması (santral kökenli)
- Travmatik sinir hasarı

## Tanı süreci
Nöropatik ağrı tanısı klinik değerlendirme + fiziksel/nörolojik muayene + gereken durumlarda elektrodiagnostik testler (EMG, sinir iletim çalışması) ve görüntülemeyle konur. DN4 ve LANSS gibi taraması ölçekleri kullanılır.

Önemli ayrım: nöropatik mi, nosiseptif mi? Klasik kas-iskelet ağrısı (nosiseptif) ile nöropatik ağrı farklı tedavi yaklaşımları gerektirir. İkisinin bir arada olması da olağandır (mikst ağrı).

## Tedavi yaklaşımı
### 1. Birinci basamak ilaçlar
- Gabapentinoidler (gabapentin, pregabalin)
- Serotonin-noradrenalin geri alım inhibitörleri (duloksetin)
- Trisiklik antidepresanlar (amitriptilin) — düşük dozda nöropatik ağrı endikasyonunda
- Topikal ajanlar: lidokain yamalar, kapsaisin

### 2. İkinci basamak / dirençli olgular
- Tramadol (opiyoid agonist + serotonerjik etki)
- Düşük doz opiyoidler (uzun vadeli kullanım dikkat gerektirir)
- Tek nokta sinir blokları
- TMS, motor korteks üzerinden uygulanan rTMS protokolleri

### 3. Tamamlayıcı yaklaşımlar
- Fizik tedavi ve egzersiz
- Bilişsel-davranışçı terapi (özellikle santral hassasiyet bileşeni baskınsa)
- Akupunktur (seçilmiş olgularda)
- Nötralojik terapi (nöral terapi) — ülkemizde bazı kliniklerde uygulanır; kanıt düzeyi sınırlıdır

## Yaşam kalitesi yönetimi
Nöropatik ağrıda tam ağrı kesilmesini hedeflemek çoğu zaman gerçekçi değildir. Hedef, ağrı düzeyini yaşam kalitesini iyileştirecek seviyeye düşürmek, uyku ve günlük işlevi geri kazanmaktır. Bu yüzden tedavi planı tek bir ilaç değil, çok bileşenlidir: ilaç + fizik tedavi + uyku düzeni + ruhsal destek.

## Sevk gereken durumlar
- Hızlı kötüleşen motor güçsüzlük (tabanca/elde, yürüyüşte)
- Sfinkter kontrolü kaybı (acil)
- Tedaviye yanıtsız trigeminal nevralji (girişimsel seçenekler için ağrı kliniği)',
 'Nöropatik ağrıda en sık karşılaştığım soru: "Bu ağrı geçer mi?" Çoğu zaman dürüst cevap "azalır, yönetilir" oluyor. Bu cümleyi söyleyebilmek için hastanın da hekimin de gerçekçi bir hedef koyması gerekir.',
 'noropatik-agri-tedavi', 7,
 'Nöropatik ağrıda tanı, ilaç tedavisi, TMS ve girişimsel seçenekler. Algoloji ve nöroloji birlikte değerlendirme.'),

-- 5) Glutatyon IV: Bilinen ve Bilinmeyen
('ce_blog_glutatyon_iv', 'tr',
 'Glutatyon IV: Bilinen ve Bilinmeyen',
 'Glutatyon, hücrenin başlıca antioksidan moleküllerinden biridir. İntravenöz (IV) glutatyon uygulamaları çeşitli endikasyonlarda gündeme gelir; ancak kanıt düzeyi heterojendir.',
 'Glutatyon, vücutta sentezlenen, üç amino asitten (sistein, glutamat, glisin) oluşan bir tripeptiddir. Hücrenin oksidatif stresine karşı temel savunma molekülüdür ve karaciğerde yoğun olarak detoksifikasyon süreçlerinde rol alır.

## Hangi durumlar için gündeme gelir?
- Parkinson hastalığı (özellikle motor olmayan belirtilere ek destek)
- Karaciğer fonksiyon bozuklukları (hepatosteatoz, kronik hepatit eşliği)
- Periferik nöropati (kemoterapi sonrası dahil)
- Otoimmün durumlar (ek destek olarak)
- Cilt sağlığı (estetik amaçlı kullanım — bu indikasyon klinik değil estetik bir kullanımdır)

Önemli not: Türkiye Sağlık Bakanlığı düzenlemeleri çerçevesinde glutatyonun "her duruma iyi gelen" bir tedavi olarak sunulmasının önüne geçmek gerekir. Her endikasyonun kanıt düzeyi ve uygunluk kriteri farklıdır.

## Kanıt durumu — özet
- Parkinson''da: küçük çaplı çalışmalar motor olmayan belirtilerde olası fayda göstermektedir; geniş randomize kontrollü çalışmalar sınırlıdır.
- Periferik nöropatide: kemoterapi sonrası nöropatide bazı destek bulguları vardır.
- Detoksifikasyon: medikal anlamda "detoks" kavramı çoğunlukla pazarlama dilidir; karaciğer fonksiyonu sağlam bir bireyde rutin glutatyon uygulamasının mutlak gereksinim olduğunu söylemek mümkün değildir.
- Cilt aydınlatma: bu kullanım klinik değil estetik bir kullanım sınıfındadır ve bu hizmet kliniğimizde sunulmamaktadır.

## Uygulama
- Damar içi (IV) infüzyon olarak verilir; doz hekimin değerlendirmesine göre belirlenir.
- Bir seans tipik olarak 30–45 dakikadır.
- Bir kür planı hekim ve hasta arasında birlikte kararlaştırılır; çoğu protokol haftalık başlar ve klinik yanıta göre seyrekleştirilir.

## Güvenlik
Doğru hasta seçimi yapıldığında glutatyon iyi tolere edilir. Bilinen önemli kontrendikasyonlar:
- Sülfit duyarlılığı / şiddetli astım (özellikle koruyucu içeren preparatlar)
- Aktif enfeksiyon
- Gebelik / laktasyon (kanıt sınırlı; risk-yarar değerlendirmesi gereklidir)

İnfüzyon sırasında bazı hastalarda hafif baş dönmesi veya bulantı bildirilebilir; bu yüzden ilk seans sonrası kısa bir gözlem süresi alınır.

## Karar nasıl verilir?
Glutatyon IV''ü değerlendirmeye almadan önce şunlar gözden geçirilir:
- Mevcut hastalık tablosu ve standart tedavinin durumu
- Beslenme ve antioksidan ihtiyacının başka kaynaklardan karşılanıp karşılanmadığı
- Eş zamanlı ilaç kullanımı (etkileşim tarama)
- Gerçekçi beklenti çerçevesi: glutatyon bir tedavi tamamlayıcısıdır, yerini alan değil.',
 'Glutatyonun "her şeye iyi geldiği" söylemi tıbben temellendirilmiş değildir; ancak doğru hasta için doğru protokolde fayda gördüğümüz vakalar olur. Önemli olan, ilk önce hangi soruyu çözmek istediğimizi netleştirmek.',
 'glutatyon-iv', 6,
 'Glutatyon IV uygulamasının klinik kullanımı, kanıt durumu, güvenlik profili ve gerçekçi beklentiler.'),

-- 6) Epilepsi mi, Nöbet mi?
('ce_blog_epilepsi_vs_nobet', 'tr',
 'Epilepsi mi, Nöbet mi? Sık Karıştırılan Bir Ayrım',
 'Tek bir nöbet "epilepsi" demek değildir. Epilepsi tanısı için belirli klinik kriterlerin karşılanması gerekir. Bu ayrım hem prognoz hem de tedavi planı açısından kritiktir.',
 '"Geçen hafta nöbet geçirdim, epilepsim mi var?" — kliniğimizde sıkça duyduğumuz sorulardan biri. Cevap çoğu zaman "doğrudan değil" oluyor.

## Nöbet nedir?
Nöbet (seizure), beyindeki nöronların anormal, aşırı veya senkronize elektriksel aktivitesinin geçici klinik yansımasıdır. Birçok nedenle olabilir:
- Düşük kan şekeri, elektrolit bozukluğu (sodyum, kalsiyum, magnezyum)
- Yüksek ateş (özellikle çocuklarda febril nöbet)
- Alkol/madde yoksunluğu
- Akut metabolik bozukluklar (üremi, hepatik ensefalopati)
- Kafa travması (akut)
- İlaç etkisi (nöbet eşiğini düşüren ilaçlar, doz artışları)
- Beyin enfarktüsü, kanama, tümör
- Uyku yoksunluğu (zemin hazırlayıcı)

Bu nedenlerin çoğu akut bir tetik yaratır; tetik düzeldiğinde nöbet eğilimi kaybolur.

## Epilepsi nedir?
Epilepsi, "tekrarlayan, kışkırtılmamış nöbetlere yatkınlık" ile tanımlanan bir nörolojik tanıdır. Uluslararası Epilepsi ile Mücadele Derneği (ILAE) 2014 tanımına göre epilepsi tanısı için aşağıdakilerden en az biri gerekir:

1. En az iki kez, en az 24 saat arayla, kışkırtılmamış nöbet geçirme,
2. Bir kışkırtılmamış nöbetten sonra, sonraki 10 yıl içinde tekrar nöbet geçirme olasılığının yüksek (≥ %60) olması (örneğin EEG''de epileptiform değişiklik veya yapısal beyin lezyonu varsa),
3. Bir epilepsi sendromu kriterlerini karşılama.

Yani: tek bir provoke edilmiş nöbet (örneğin elektrolit bozukluğu sonrası) **epilepsi tanısı koydurmaz**. Tek bir kışkırtılmamış nöbet de — kanıtlar destekler nitelikte değilse — koydurmayabilir.

## Tanı süreci
Bir nöbet sonrası değerlendirmede şunlara bakılır:
- Detaylı öykü (görgü tanığının tarifi çok değerlidir; ses kaydı/video varsa daha da iyi)
- Nörolojik muayene
- EEG (elektroensefalografi) — uyanık ve uyku EEG''si birlikte daha bilgilendiricidir
- Beyin MR (özellikle yapısal nedenleri ekarte etmek için)
- Kan testleri (akut tetikleri taramak)

EEG normal çıkması epilepsi tanısını dışlamaz; epilepsi klinik bir tanıdır, EEG destekleyici testtir.

## Tedavi
- Tek bir provoke nöbet sonrası genelde antiepileptik başlanmaz; tetik tedavi edilir, takip yapılır.
- İki kışkırtılmamış nöbet sonrası antiepileptik başlanması değerlendirilir.
- İlaç seçimi epilepsi tipine göre yapılır (fokal vs jeneralize); ek olarak hastanın yaşı, gebelik durumu, eşlik eden hastalıkları, ilaç etkileşimleri rol oynar.

## Yaşam tarzı
- Uyku düzeni en kritik tetiklerden biridir.
- Alkol ve uyarıcı maddelerden kaçınma.
- Yorucu fiziksel aktivite ve dehidratasyondan korunma.
- Belirli mesleklerde (örneğin sürücülük, yüksekte çalışma) kontrol süresi gerekebilir; bu mevzuata uyumlu sürdürülmelidir.

## Acil değerlendirme gerektiren durumlar
- 5 dakikadan uzun süren nöbet (status epilepticus — acil)
- Bir nöbeti diğeri takip ederse, arada hasta kendine gelmiyorsa (acil)
- İlk kez nöbet (özellikle erişkinde, mutlaka değerlendirme)
- Hamilelikte nöbet
- Nöbet sonrası inatçı bilinç bulanıklığı, motor güçsüzlük',
 'Tek bir nöbet sonrası "epilepsim var" demek erken; "yok" demek de aceleci. Bu ayrım dikkatli bir öykü, doğru testler ve sabırlı bir takiple netleşir. Aceleci tanı kadar geç tanı da hastayı zorlar.',
 'epilepsi-vs-nobet', 7,
 'Epilepsi ile tek nöbet arasındaki klinik fark, tanı kriterleri ve tedavi yaklaşımları.')

ON CONFLICT (content_entry_id, locale) DO NOTHING;

-- ─── EN translations (3 of 6 — calendar drafted set) ──────────────────────────

INSERT INTO content_entry_translations (
  content_entry_id, locale, title, lead_paragraph, body_markdown,
  doctor_note_markdown, slug_localised, reading_minutes, meta_description
) VALUES

('ce_blog_tms_nedir', 'en',
 'What is TMS? Mechanism and Clinical Use',
 'Transcranial magnetic stimulation (TMS) is a non-pharmacological treatment that uses brief magnetic fields applied through the scalp to modulate neural activity in specific brain regions.',
 'Transcranial Magnetic Stimulation (TMS) works by inducing an electrical current in cortical neurons beneath the scalp via a coil that produces an alternating magnetic field. Depending on the protocol, the current either increases or decreases the excitability of the targeted region.

## Background and regulation
TMS entered clinical practice after Anthony Barker''s first human application in 1985. The US FDA approved TMS for major depressive disorder in 2008 and deep TMS (dTMS) protocols for OCD in 2018. Migraine and smoking cessation are additional approved indications.

## How is it delivered?
- The patient is awake and seated; sedation is not required.
- The coil is positioned over the target region (e.g. left dorsolateral prefrontal cortex).
- A session typically lasts 20–40 minutes; a course is usually 4–6 weeks at 5 sessions per week.
- Patients return to normal activity afterward; driving is not restricted.

## When is it considered?
- Treatment-resistant major depression
- Obsessive-compulsive disorder (OCD)
- Migraine prophylaxis where preventive medication is not tolerated or insufficient
- Anxiety disorders with depressive comorbidity
- Post-stroke rehabilitation (motor and language)
- Selected neuropathic pain syndromes

Evidence levels differ across indications; the appropriate protocol is determined after a clinical assessment.

## Safety and contraindications
TMS is generally well-tolerated, with no sedation requirement and a limited systemic side-effect profile. The following preclude use or require careful re-evaluation:

- Magnetic or electronic implants in the head (excluding cardiac pacemakers, which are a separate consideration)
- Active epilepsy or elevated seizure risk (including patients on medications that lower seizure threshold)
- Pregnancy (limited evidence; risk-benefit assessment required)
- Uncontrolled psychiatric decompensation

A safety screening form is mandatory before treatment and is valid for 365 days.

## What to expect
TMS is a clinical tool, not a one-shot fix. Response rates depend on indication and protocol; in depression a meaningful proportion of patients report clear improvement during a 4–6 week course. We do not expect results from a single session; the full course and any subsequent maintenance plan are evaluated together.',
 'I think of TMS as one part of the plan, not the plan itself. Where it helps, where it falls short, when medication or therapy is the right next step — these are conversations we have together at the start.',
 'tms-nedir', 6,
 'Transcranial magnetic stimulation (TMS): mechanism, indications, safety, and realistic expectations.'),

('ce_blog_tedaviye_direncli_dep', 'en',
 'Treatment-Resistant Depression: New Options',
 'Major depression that has not responded to at least two adequately-trialed antidepressants is classified as treatment-resistant. At that point TMS, ketamine/esketamine, and other neuromodulation options should be evaluated together.',
 'First-line depression treatment usually combines an SSRI (or similar antidepressant) with psychotherapy. Most patients improve. A subset, however, do not — these are described as having treatment-resistant depression (TRD).

## What does treatment-resistant depression mean?
The clinical definition: failure to achieve clinical response after at least two adequate trials of antidepressants from different classes, each at a sufficient dose for at least 6 weeks. "Inadequate trial" is a common confounder — under-dosing, premature discontinuation, or non-adherence may mean the medication was never genuinely tested. So labelling TRD is itself a clinical assessment.

## Available options
For a patient who is genuinely TRD, several options come to the table:

### 1. Augmentation
Adding a second agent to the existing antidepressant: lithium, an atypical antipsychotic (quetiapine, aripiprazole), thyroid hormone (T3). These have strong evidence and should not be skipped.

### 2. Transcranial magnetic stimulation (TMS)
The US FDA approved TMS for depression in 2008. In TRD trials, a meaningful proportion of patients report clear improvement during a 4–6 week course. Existing medications generally do not need to be stopped; the protocol can be integrated.

### 3. Esketamine (intranasal)
Esketamine, an NMDA receptor antagonist, is FDA-approved for TRD. Access conditions and regulatory frameworks differ in Türkiye; not every patient is eligible.

### 4. Electroconvulsive therapy (ECT)
ECT remains the highest-response treatment for severe or life-threatening depressive episodes. Modern ECT protocols have a markedly lighter side-effect profile than older techniques.

### 5. Psychotherapy
Cognitive-behavioral therapy, acceptance and commitment therapy, interpersonal therapy — these are not "add-ons" in TRD but the spine of the plan. A patient who has not responded to medication alone may respond to therapy + medication + neuromodulation in combination.

## How is the decision made?
- Were prior trials genuinely adequate?
- Concurrent medical conditions (history of seizure, cardiac pacemaker, intracranial metal — relevant for TMS screening)
- Social support and follow-up capacity
- Patient preference (oral medication vs in-clinic procedure; tolerance for sedation)

## Managing expectations
Treatment-resistant depression does not yield to a quick fix. A partial response after one course is itself a result and helps plan the next step better. A non-response does not mean "no hope"; it means "this protocol at this dose for this duration was not sufficient."',
 'Diagnosing treatment-resistant depression and accepting that diagnosis are not the same thing. Often what looks "resistant" is actually under-dosed or under-trialed, and a careful re-optimization changes the picture.',
 'tedaviye-direncli-depresyon', 7,
 'Treatment-resistant depression: TMS, esketamine, ECT, and augmentation strategies. Clinical decision pathway.'),

('ce_blog_glutatyon_iv', 'en',
 'Glutathione IV: What the Evidence Says',
 'Glutathione is one of the cell''s primary antioxidant molecules. Intravenous (IV) glutathione is discussed in several indications, but the evidence quality varies considerably.',
 'Glutathione is a tripeptide (cysteine, glutamate, glycine) synthesized in the body. It is the cell''s principal defence against oxidative stress and plays a central role in hepatic detoxification.

## Where is it considered?
- Parkinson''s disease (especially as an adjunct for non-motor symptoms)
- Hepatic dysfunction (steatosis, chronic hepatitis comorbidity)
- Peripheral neuropathy (including chemotherapy-induced)
- Autoimmune conditions (as supportive care)
- Skin appearance (cosmetic indication — not a clinical use; not offered at this clinic)

A note on positioning: under TR Sağlık Bakanlığı rules, glutathione cannot be presented as a treatment "good for everything." Each indication has its own evidence level and eligibility criteria.

## Evidence summary
- Parkinson''s: small studies suggest possible benefit in non-motor symptoms; large randomized trials are limited.
- Peripheral neuropathy: some supporting data in chemotherapy-induced neuropathy.
- "Detox": the medical concept of "detoxification" is mostly a marketing term; in a person with intact hepatic function, routine glutathione is not an established necessity.
- Skin lightening: this is a cosmetic, not a clinical, indication — it is not offered here.

## Administration
- Given as an IV infusion; dose is determined by clinical assessment.
- A session typically lasts 30–45 minutes.
- A course is decided jointly between physician and patient; most protocols start weekly and taper based on response.

## Safety
Glutathione is generally well-tolerated with appropriate patient selection. Important contraindications include:
- Sulphite hypersensitivity / severe asthma (especially preparations with preservatives)
- Active infection
- Pregnancy / lactation (limited evidence; risk-benefit assessment required)

Mild dizziness or nausea are reported by some patients during infusion; a short post-infusion observation period is standard for the first session.

## How is the decision made?
Before considering glutathione IV:
- Current diagnosis and the status of standard treatment
- Whether antioxidant needs can be met from other sources (diet, oral supplementation)
- Concurrent medications (interaction screening)
- Realistic framing: glutathione is an adjunct, not a replacement for primary treatment.',
 'The narrative that glutathione "helps with everything" is not medically grounded; but for the right patient with the right protocol, we do see benefit. The first step is clarifying which question we''re actually trying to answer.',
 'glutatyon-iv', 6,
 'Glutathione IV: clinical indications, evidence, safety profile, and realistic expectations.')

ON CONFLICT (content_entry_id, locale) DO NOTHING;
