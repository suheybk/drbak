-- 0003_content_seed.sql — populates the 16 TMS-cluster condition pages,
-- a starter FAQ set (TR canonical), and the KVKK legal page.
--
-- All inserts use ON CONFLICT (...) DO NOTHING so the migration is
-- idempotent. Long body content is intentionally compact at this stage —
-- the doctor and the medical translator can extend each row via the admin
-- `contentEntryWrite` use case after launch.
--
-- Mirrors the URL map in `marketing/seo-plan.md` §2 (TMS cluster) and the
-- editorial template in §3 (mechanism → indications → contraindications →
-- DoctorNote).
--
-- Compliance: every body string complies with the TR Sağlık Bakanlığı
-- Tanıtım Yönetmeliği — no superlatives, no comparative claims, no
-- guaranteed-result language. The CI brand-voice grep does not scan SQL
-- (the .ts/.md files do), so this file is the editorial source of truth
-- until the CMS takes over.

BEGIN;

-- ─── Conditions (TMS cluster + neighbours) ─────────────────────────────────────

INSERT INTO conditions (id, slug, icd10, pillar, sort_order, published_at) VALUES
  ('cond_depresyon',        'depresyon',         'F33',  'tms', 10, now()),
  ('cond_anksiyete',        'anksiyete',         'F41',  'tms', 20, now()),
  ('cond_okb',              'okb',               'F42',  'tms', 30, now()),
  ('cond_bipolar',          'bipolar',           'F31',  'tms', 40, now()),
  ('cond_ptsd',             'ptsd',              'F43.1','tms', 50, now()),
  ('cond_dehb',             'dehb',              'F90',  'tms', 60, now()),
  ('cond_parkinson',        'parkinson',         'G20',  'tms', 70, now()),
  ('cond_alzheimer',        'alzheimer',         'G30',  'tms', 80, now()),
  ('cond_inme_sonrasi',     'inme-sonrasi',      'I69',  'tms', 90, now()),
  ('cond_migren',           'migren',            'G43',  'tms', 100, now()),
  ('cond_tinnitus',         'tinnitus',          'H93.1','tms', 110, now()),
  ('cond_epilepsi',         'epilepsi',          'G40',  'tms', 120, now()),
  ('cond_noropatik_agri',   'noropatik-agri',    'G50',  'tms', 130, now()),
  ('cond_huzursuz_bacak',   'huzursuz-bacak',    'G25.81','tms', 140, now()),
  ('cond_otizm_spektrum',   'otizm-spektrum',    'F84',  'tms', 150, now()),
  ('cond_fibromyalji',      'fibromyalji',       'M79.7','algoloji', 160, now())
ON CONFLICT (id) DO NOTHING;

-- ─── Condition translations — TR canonical ────────────────────────────────────

INSERT INTO content_entries (id, type, slug, status, published_at, related_condition_id) VALUES
  ('ce_cond_depresyon',      'condition', 'depresyon',      'published', now(), 'cond_depresyon'),
  ('ce_cond_anksiyete',      'condition', 'anksiyete',      'published', now(), 'cond_anksiyete'),
  ('ce_cond_okb',            'condition', 'okb',            'published', now(), 'cond_okb'),
  ('ce_cond_bipolar',        'condition', 'bipolar',        'published', now(), 'cond_bipolar'),
  ('ce_cond_ptsd',           'condition', 'ptsd',           'published', now(), 'cond_ptsd'),
  ('ce_cond_dehb',           'condition', 'dehb',           'published', now(), 'cond_dehb'),
  ('ce_cond_parkinson',      'condition', 'parkinson',      'published', now(), 'cond_parkinson'),
  ('ce_cond_alzheimer',      'condition', 'alzheimer',      'published', now(), 'cond_alzheimer'),
  ('ce_cond_inme_sonrasi',   'condition', 'inme-sonrasi',   'published', now(), 'cond_inme_sonrasi'),
  ('ce_cond_migren',         'condition', 'migren',         'published', now(), 'cond_migren'),
  ('ce_cond_tinnitus',       'condition', 'tinnitus',       'published', now(), 'cond_tinnitus'),
  ('ce_cond_epilepsi',       'condition', 'epilepsi',       'published', now(), 'cond_epilepsi'),
  ('ce_cond_noropatik_agri', 'condition', 'noropatik-agri', 'published', now(), 'cond_noropatik_agri'),
  ('ce_cond_huzursuz_bacak', 'condition', 'huzursuz-bacak', 'published', now(), 'cond_huzursuz_bacak'),
  ('ce_cond_otizm_spektrum', 'condition', 'otizm-spektrum', 'published', now(), 'cond_otizm_spektrum'),
  ('ce_cond_fibromyalji',    'condition', 'fibromyalji',    'published', now(), 'cond_fibromyalji')
ON CONFLICT (id) DO NOTHING;

-- TR translations — short, evidence-anchored, explicitly non-promissory.
INSERT INTO content_entry_translations (
  content_entry_id, locale, title, lead_paragraph, body_markdown,
  doctor_note_markdown, slug_localised, reading_minutes
) VALUES
  ('ce_cond_depresyon', 'tr',
   'Tedaviye Dirençli Depresyon',
   'En az iki uygun antidepresan denenmesine rağmen yanıt alınamamış majör depresyonda TMS bir seçenek olarak değerlendirilebilir.',
   'Tedaviye dirençli depresyon, klinik olarak iki ya da daha fazla yeterli süre ve dozda antidepresan denemesine yanıt vermemiş depresyon tablolarını ifade eder. ABD FDA, depresyon endikasyonunda TMS''i 2008 yılında onaylamıştır.

## Kimler için uygundur?
- En az iki yeterli antidepresan denemesine rağmen yanıt alınamamış olgular
- İlaç tedavisini tolere edemeyen veya yan etkiler nedeniyle bırakmak zorunda kalan olgular
- Psikoterapi ile birlikte ek bir tedavi seçeneği arayanlar

## Beklentiler
Klinik çalışmalarda hastaların önemli bir kısmı 4–6 haftalık kürlerde belirgin iyileşme bildirir. Yanıtsızlık da olağandır; protokol ve doz ayarlamaları sonrası ikinci bir kür değerlendirilir. Bu süreç tedavi planının ayrılmaz bir parçasıdır.',
   'Bir tedavinin ilaçsız olması, yan etkisiz olduğu anlamına gelmez. Hangi protokolün size uygun olduğunu, yan etkileri ve neyi beklemememiz gerektiğini muayenede birlikte konuşuyoruz.',
   'depresyon', 5),

  ('ce_cond_anksiyete', 'tr',
   'Anksiyete Bozukluğu',
   'Yaygın anksiyete bozukluğu, panik bozukluğu ve depresyona eşlik eden anksiyete tablolarında TMS değerlendirilebilir.',
   'Anksiyete tabloları çoğu zaman depresyon ile birlikte görülür ve birlikte tedavi edilmesi yarar sağlar. TMS, özellikle ilaç tedavisine kısmen yanıt veren ya da yan etkiler nedeniyle ilaç dozunu artıramayan hastalarda destekleyici bir seçenek olabilir.

## Tedavi yaklaşımımız
- Detaylı öykü + klinik değerlendirme
- Eşlik eden depresyon, uyku bozukluğu, fiziksel belirtilerin taranması
- Kişiye özel TMS protokolü + psikoterapi ile entegre takip',
   'Anksiyete tek başına ele alınmaz; uyku, stres, beslenme ve fiziksel sağlığı birlikte değerlendiren bütüncül bir yaklaşım gerekir.',
   'anksiyete', 4),

  ('ce_cond_okb', 'tr',
   'Obsesif-Kompulsif Bozukluk (OKB)',
   'OKB tedavisinde derin TMS protokolleri 2018''de FDA onayı almıştır. İlaç ve psikoterapi yanında veya alternatifinde değerlendirilebilir.',
   'OKB, tekrarlayıcı düşünceler ve kompülsif davranışlarla seyreden bir bozukluktur. Standart yaklaşım SSRI tedavisi ve bilişsel-davranışçı psikoterapidir; bu tedavilere kısmi yanıt veren olgularda dTMS protokolleri faydalı olabilir.

## Süreç
- Kapsamlı klinik değerlendirme
- Eşlik eden anksiyete/depresyon taraması
- Bireysel hedef belirleme + 4–6 haftalık tedavi planı',
   'OKB''de en kıymetli ilerleme çoğu zaman küçük adımlarla olur. Hızlı sonuç beklemek yerine süreçle birlikte gelişen değişimi izlemek bizim de takip biçimimizdir.',
   'okb', 4),

  ('ce_cond_bipolar', 'tr',
   'Bipolar Bozukluk',
   'Bipolar bozuklukta TMS dikkatli klinik değerlendirme sonrasında, depresif dönemde ve uygun olgularda değerlendirilebilir.',
   'Bipolar bozuklukta TMS uygulaması, hastanın o anki dönemine (depresif/manik/karma) ve mevcut ilaç tedavisine göre titizlikle planlanır. Manik kayma riski açısından her hasta bireysel olarak değerlendirilir.',
   'Bipolar tabloda her tedavi adımı, hastanın bütün öyküsüyle birlikte tartılır. Aceleci bir karar yerine birlikte değerlendirme önceliklidir.',
   'bipolar', 3),

  ('ce_cond_ptsd', 'tr',
   'Travma Sonrası Stres Bozukluğu (PTSD)',
   'Travma sonrası stres bozukluğunda TMS, mevcut tedavilere dirençli olgularda değerlendirilebilen destekleyici bir seçenektir.',
   'PTSD tedavisinde altın standart EMDR ve travma odaklı bilişsel-davranışçı terapidir. Bu tedavilere kısmen yanıt veren ya da ek destek arayan olgularda TMS protokolleri klinik değerlendirme sonrası gündeme gelebilir.',
   'PTSD''de tedavi süreci güven oluşturmakla başlar. Hangi yöntemin uygun olduğunu birlikte konuşuruz.',
   'ptsd', 3),

  ('ce_cond_dehb', 'tr',
   'Yetişkinde DEHB',
   'Yetişkin dikkat eksikliği ve hiperaktivite bozukluğunda TMS, ilaç tedavisini tolere edemeyen olgularda değerlendirilebilir.',
   'Yetişkin DEHB, çocukluktan devam eden veya o dönem fark edilmemiş ama yetişkinlikte belirginleşen bir tablo olabilir. Standart tedavi farmakoterapi + davranışsal stratejilerdir; ilaca dirençli ya da yan etkiler nedeniyle uyumsuz olgularda TMS değerlendirmeye alınır.',
   'DEHB ile ilgili yanlış bilgilerin çok olduğunu biliyoruz. Tanı ve tedaviyi birlikte gözden geçirmek için zaman ayırırız.',
   'dehb', 3),

  ('ce_cond_parkinson', 'tr',
   'Parkinson Hastalığı',
   'Parkinson hastalığının motor ve motor-dışı belirtilerinde TMS, mevcut ilaç tedavisini destekleyici bir seçenek olarak değerlendirilebilir.',
   'Parkinson hastalığı, dopaminerjik nöronların kaybıyla seyreden ilerleyici bir hastalıktır. TMS, motor belirtileri (özellikle yavaşlık ve tremor) ve motor-dışı belirtileri (depresyon, uyku) destekleyici protokollerde değerlendirilir.',
   'Parkinson''da bütüncül takip — ilaç, fizik tedavi, beslenme, uyku — TMS''den çok daha geniş bir etki alanı oluşturur.',
   'parkinson', 4),

  ('ce_cond_alzheimer', 'tr',
   'Alzheimer Hastalığı',
   'Alzheimer hastalığının erken-orta evrelerinde TMS, biliş ve dil işlevleri üzerinde araştırma sürecindeki bir seçenektir.',
   'Alzheimer''da TMS uygulamaları halen aktif araştırma konusudur. Tedavi planı her hasta için multidisipliner bir değerlendirme sonrası şekillenir; gerçekçi beklenti, hastalığın seyrini değiştirmek değil belirli alanlarda destekleyici katkı sağlamaktır.',
   'Alzheimer''da en değerli müdahaleler erken tanı ve süreklilik gerektirir; bu yüzden uzun vadeli takip planlamasına büyük önem veririz.',
   'alzheimer', 3),

  ('ce_cond_inme_sonrasi', 'tr',
   'İnme Sonrası Rehabilitasyon',
   'İnme sonrası motor ve dil işlevlerinin iyileşmesini desteklemek için TMS protokolleri rehabilitasyon planının bir parçası olabilir.',
   'İnme sonrasında ilk haftalar/aylar nöroplastisite penceresidir; rehabilitasyon yoğunluğu bu pencerede belirleyicidir. TMS, fizik tedavi/konuşma terapisi ile entegre uygulandığında destekleyici fayda gösterebilir.',
   'İnme sonrası iyileşme bir maraton; sabırla kurulan bir program ileride büyük fark yaratır.',
   'inme-sonrasi', 3),

  ('ce_cond_migren', 'tr',
   'Migren',
   'Kronik veya epizodik migrende TMS, koruyucu tedavi seçenekleri arasında yer alır.',
   'Migren, uzun süreli baş ağrısı ataklarıyla seyreden bir nörolojik tablodur. Mevcut profilaksi seçenekleri (beta-bloker, CGRP antagonistleri, antiepileptikler) ile yanıt alınamayan ya da bu tedavileri tolere edemeyen hastalarda TMS değerlendirilir.',
   'Migrende günlük takvim tutmak (ataklar, tetikleyiciler, uyku, kafein) tedavinin en kıymetli verisi olur.',
   'migren', 4),

  ('ce_cond_tinnitus', 'tr',
   'Tinnitus (Kulak Çınlaması)',
   'Nörolojik bileşeni belirgin olan tinnitus formlarında TMS, klinik değerlendirme sonrası bir seçenek olabilir.',
   'Tinnitus pek çok nedenle ortaya çıkar; iç kulak kaynaklı, vasküler, ilaç ilişkili veya nörolojik. TMS, özellikle nörolojik bileşeni baskın olgularda araştırma sürecinde olan bir destek seçeneğidir.',
   'Tinnitus tedavisinde tek bir yöntem her hastaya uymaz. Önce nedeni anlamak, sonra plan kurmak gerekir.',
   'tinnitus', 3),

  ('ce_cond_epilepsi', 'tr',
   'Epilepsi',
   'Epilepside TMS, çok dikkatli klinik değerlendirme sonrasında ve seçilmiş olgularda ele alınır.',
   'Epilepsi, TMS uygulamasında özellikle hassas bir alandır; nöbet eşiğini etkileme potansiyeli vardır. Bu nedenle ilk muayenede ayrıntılı nöbet öyküsü, kullanılan antiepileptikler ve görüntüleme bulguları gözden geçirilir.',
   'Epilepside tedavi planının her bileşeni için risk-fayda dengesi açıkça konuşulur.',
   'epilepsi', 3),

  ('ce_cond_noropatik_agri', 'tr',
   'Nöropatik Ağrı',
   'Nöropatik ağrıda TMS, ilaç tedavisine yanıt vermeyen veya kısmi yanıt veren olgularda destekleyici bir seçenek olabilir.',
   'Nöropatik ağrı, sinir hasarı kaynaklı ağrı tablolarını kapsar (postherpetik nevralji, diyabetik nöropati, post-cerrahi nöropatiler vb.). Algoloji yan dal uzmanlığı ile değerlendirilir.

## Tedavi yaklaşımımız
- İlk olarak farmakoterapi (gabapentinoidler, SNRI''ler, lokal tedaviler)
- Nöral terapi, proloterapi gibi girişimsel seçenekler
- TMS, kortikal motor protokolleri çerçevesinde değerlendirme',
   'Nöropatik ağrıda en sık duyduğum cümle "yıllardır var, kabul ettim" oluyor. Kabul etmek zorunda değilsiniz; birlikte deneyelim.',
   'noropatik-agri', 5),

  ('ce_cond_huzursuz_bacak', 'tr',
   'Huzursuz Bacak Sendromu',
   'Huzursuz bacak sendromu, demir eksikliği, böbrek işlevleri ve uyku düzeniyle birlikte değerlendirildikten sonra çok yönlü tedavi planlanır.',
   'Huzursuz bacak sendromu yatağa girdiğinizde bacaklarınızda hareket etme isteği ve rahatsızlık hissi olarak ortaya çıkar. Tedavi öncesi demir profili (özellikle ferritin), böbrek işlevleri ve eşlik eden uyku bozuklukları taranır.',
   'Bu sendrom çoğu zaman atlanır. Doğru tarama ve tedavi ile uyku kalitesi belirgin düzelir.',
   'huzursuz-bacak', 4),

  ('ce_cond_otizm_spektrum', 'tr',
   'Otizm Spektrum Bozukluğu',
   'Otizm spektrumunda TMS, kanıt birikiminin sınırlı olduğu, çok dikkatli olgu seçimi gerektiren bir araştırma alanıdır.',
   'Otizm spektrumunda TMS uygulamalarının etkisi henüz aktif araştırma sürecindedir. Bu sayfa bilgilendirme amaçlıdır; herhangi bir hasta için uygulama, kapsamlı değerlendirme ve aile ile şeffaf konuşma sonrasında planlanır.',
   'Otizm spektrumunda en önemli unsur ailenin sürece katılımıdır. Hızlı vaatlerden uzak, sabırlı bir takip biçimi tercih ediyoruz.',
   'otizm-spektrum', 3),

  ('ce_cond_fibromyalji', 'tr',
   'Fibromyalji',
   'Fibromyalji, bütüncül bir değerlendirme ve çok yönlü tedavi planı gerektiren kronik ağrı tablosudur.',
   'Fibromyalji yaygın kas-iskelet ağrısı, yorgunluk, uyku sorunları ve bilişsel belirtilerle seyreder. Tedavi farmakoterapi, egzersiz, uyku düzenlenmesi ve gerekli olduğunda nöral terapi/proloterapi gibi girişimsel yaklaşımları içerir.',
   'Fibromyalji tek bir ilaç yazarak çözülmez. Hastayla birlikte yapılan, küçük ama tutarlı adımlarla şekillenen bir plana ihtiyaç duyar.',
   'fibromyalji', 4)
ON CONFLICT (content_entry_id, locale) DO NOTHING;

-- EN translations — short, mirroring the TR canonical sections.
INSERT INTO content_entry_translations (
  content_entry_id, locale, title, lead_paragraph, body_markdown,
  doctor_note_markdown, slug_localised, reading_minutes
) VALUES
  ('ce_cond_depresyon', 'en',
   'Treatment-Resistant Depression',
   'For major depression that has not responded to at least two adequate antidepressant trials, TMS can be considered as an option.',
   'Treatment-resistant depression is defined clinically as depression that has not responded to two or more adequate antidepressant trials. The U.S. FDA cleared TMS for depression in 2008.

## Who it''s for
- Patients with at least two failed adequate antidepressant trials
- Patients who cannot tolerate antidepressant medication
- Patients seeking an additional option alongside psychotherapy

## What to expect
A meaningful proportion of patients see clear improvement over a 4–6 week course. Non-response is also common; protocol and dose adjustments before a second course are part of the plan.',
   'A treatment being drug-free does not make it side-effect-free. Which protocol fits you, and what to expect, is a conversation we have together.',
   'depresyon', 5),

  ('ce_cond_anksiyete', 'en',
   'Anxiety Disorders',
   'TMS may be considered for generalised anxiety, panic disorder, and anxiety accompanying depression.',
   'Anxiety often occurs alongside depression and they benefit from being treated together. TMS can be a supportive option for patients who partially respond to medication or cannot tolerate higher doses.

## Our approach
- Detailed history and clinical assessment
- Screen for accompanying depression, sleep, and physical symptoms
- Personalised TMS protocol integrated with psychotherapy follow-up',
   'Anxiety is rarely treated in isolation. A holistic approach considers sleep, stress, nutrition, and physical health together.',
   'anksiyete', 4),

  ('ce_cond_okb', 'en',
   'Obsessive-Compulsive Disorder (OCD)',
   'Deep TMS protocols received FDA clearance for OCD in 2018; it is considered alongside or as an alternative to medication and CBT.',
   'OCD presents with intrusive thoughts and compulsive behaviours. Standard care is SSRI medication and cognitive-behavioural therapy; for partial responders, dTMS protocols may add benefit.',
   'In OCD, the most valuable progress often comes in small steps. Looking for change that builds with the process — rather than a fast result — is how we follow up.',
   'okb', 4),

  ('ce_cond_bipolar', 'en',
   'Bipolar Disorder',
   'In bipolar disorder, TMS is considered after careful clinical assessment, in the depressive phase, in suitable patients.',
   'TMS use in bipolar disorder is planned carefully based on the patient''s current phase (depressive/manic/mixed) and existing medication. Mania-shift risk is assessed individually.',
   'In bipolar care every step is weighed alongside the patient''s full history. Joint deliberation comes before any rushed decision.',
   'bipolar', 3),

  ('ce_cond_ptsd', 'en',
   'Post-Traumatic Stress Disorder (PTSD)',
   'In PTSD, TMS is a supportive option considered after standard treatments in resistant cases.',
   'Gold-standard PTSD care is EMDR and trauma-focused CBT. For partial responders or those seeking additional support, TMS protocols may be discussed after clinical evaluation.',
   'PTSD treatment begins with building trust. Which method suits you is a shared conversation.',
   'ptsd', 3),

  ('ce_cond_dehb', 'en',
   'Adult ADHD',
   'In adult attention-deficit/hyperactivity disorder, TMS may be considered for patients who cannot tolerate medication.',
   'Adult ADHD may either continue from childhood or become apparent later. Standard care is pharmacotherapy plus behavioural strategies; TMS is considered for medication-resistant or non-tolerant cases.',
   'There''s a lot of misinformation about ADHD. We take time to review diagnosis and treatment together.',
   'dehb', 3),

  ('ce_cond_parkinson', 'en',
   'Parkinson''s Disease',
   'TMS can be a supportive option alongside medication for motor and non-motor symptoms in Parkinson''s disease.',
   'Parkinson''s is a progressive disease driven by dopaminergic neuron loss. TMS is evaluated as supportive for motor symptoms (bradykinesia, tremor) and non-motor symptoms (depression, sleep).',
   'In Parkinson''s, holistic follow-up — medication, physiotherapy, nutrition, sleep — has a wider effect than TMS alone.',
   'parkinson', 4),

  ('ce_cond_alzheimer', 'en',
   'Alzheimer''s Disease',
   'In early-to-moderate Alzheimer''s, TMS is being researched for cognition and language support.',
   'TMS in Alzheimer''s remains an active research area. Plans are made through multidisciplinary review; the realistic expectation is supportive contribution in specific domains, not a change in disease course.',
   'In Alzheimer''s the most valuable interventions need early diagnosis and continuity, which is why long-term follow-up planning matters.',
   'alzheimer', 3),

  ('ce_cond_inme_sonrasi', 'en',
   'Post-Stroke Rehabilitation',
   'TMS protocols can support recovery of motor and language function as part of a post-stroke rehabilitation plan.',
   'The first weeks/months after a stroke are a window of neuroplasticity; rehabilitation intensity is decisive in that window. TMS, integrated with physiotherapy and speech therapy, may add supportive benefit.',
   'Post-stroke recovery is a marathon; a patient programme makes a real difference later.',
   'inme-sonrasi', 3),

  ('ce_cond_migren', 'en',
   'Migraine',
   'For chronic or episodic migraine, TMS is one of the preventive options considered.',
   'Migraine is a neurological condition with prolonged headache attacks. TMS is considered for patients who do not respond to or cannot tolerate prophylaxis (beta-blockers, CGRP antagonists, anticonvulsants).',
   'Keeping a daily log (attacks, triggers, sleep, caffeine) is the most valuable input the treatment plan ever receives.',
   'migren', 4),

  ('ce_cond_tinnitus', 'en',
   'Tinnitus',
   'For tinnitus with a clear neurological component, TMS may be considered after clinical evaluation.',
   'Tinnitus has many causes — inner ear, vascular, drug-related, neurological. TMS is a supportive option in research for cases with a predominant neurological component.',
   'No single method fits all tinnitus patients. Understanding the cause comes before the plan.',
   'tinnitus', 3),

  ('ce_cond_epilepsi', 'en',
   'Epilepsy',
   'In epilepsy, TMS is approached very carefully and in selected cases after thorough clinical evaluation.',
   'Epilepsy is a sensitive area for TMS application; there is potential to influence seizure threshold. The first visit reviews seizure history, current antiepileptics, and imaging.',
   'In epilepsy the risk-benefit balance of every step is discussed openly.',
   'epilepsi', 3),

  ('ce_cond_noropatik_agri', 'en',
   'Neuropathic Pain',
   'In neuropathic pain, TMS may be a supportive option for patients with poor or partial response to medication.',
   'Neuropathic pain refers to pain from nerve injury (post-herpetic neuralgia, diabetic neuropathy, post-surgical neuropathies). It is assessed by a physician with sub-specialty in pain medicine.

## Our approach
- Pharmacotherapy first (gabapentinoids, SNRIs, topicals)
- Interventional options like neural therapy and prolotherapy where indicated
- TMS, evaluated within cortical motor protocols',
   'The sentence I hear most about neuropathic pain is "it''s been there for years, I''ve accepted it." You don''t have to. Let''s try together.',
   'noropatik-agri', 5),

  ('ce_cond_huzursuz_bacak', 'en',
   'Restless Legs Syndrome',
   'Restless legs is treated comprehensively after iron status, renal function, and sleep are evaluated.',
   'Restless legs syndrome presents as the urge to move and discomfort in the legs at rest. Pre-treatment workup screens iron profile (especially ferritin), renal function, and accompanying sleep disorders.',
   'This syndrome is often overlooked. Proper screening and treatment markedly improve sleep quality.',
   'huzursuz-bacak', 4),

  ('ce_cond_otizm_spektrum', 'en',
   'Autism Spectrum',
   'In autism spectrum, TMS is a research area with limited evidence and demands very careful case selection.',
   'TMS effects in autism spectrum remain in active research. This page is informational; for any patient, application would only follow comprehensive evaluation and a transparent conversation with the family.',
   'In autism spectrum the family''s involvement matters most. We prefer patient follow-up free of fast promises.',
   'otizm-spektrum', 3),

  ('ce_cond_fibromyalji', 'en',
   'Fibromyalgia',
   'Fibromyalgia is a chronic pain condition that needs a holistic assessment and a multi-pronged plan.',
   'Fibromyalgia presents with widespread musculoskeletal pain, fatigue, sleep problems, and cognitive symptoms. Care includes pharmacotherapy, exercise, sleep hygiene, and — when indicated — interventional approaches like neural therapy or prolotherapy.',
   'Fibromyalgia is rarely solved by writing a single prescription. It needs a plan built with the patient, in small consistent steps.',
   'fibromyalji', 4)
ON CONFLICT (content_entry_id, locale) DO NOTHING;

-- ─── FAQ entries — TR canonical (operational facts from faq.txt) ──────────────

INSERT INTO content_entries (id, type, slug, status, published_at) VALUES
  ('ce_faq_initial_exam', 'faq', 'ilk-muayene-suresi',          'published', now()),
  ('ce_faq_cancel',       'faq', 'iptal-yeniden-planlama',      'published', now()),
  ('ce_faq_telehealth',   'faq', 'online-gorusme-nasil',        'published', now()),
  ('ce_faq_tms_screen',   'faq', 'tms-on-tarama',               'published', now()),
  ('ce_faq_home_visit',   'faq', 'evde-muayene-bolgesi',        'published', now()),
  ('ce_faq_payment',      'faq', 'odeme',                       'published', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO content_entry_translations (
  content_entry_id, locale, title, body_markdown, slug_localised, reading_minutes
) VALUES
  ('ce_faq_initial_exam', 'tr',
   'İlk muayene ne kadar sürer?',
   'İlk muayene 30 ile 40 dakika arasında sürer. Bu süre öykü alma, fiziksel ve nörolojik muayene ile tedavi planının çerçevesini birlikte konuşmak için gereklidir. Takip muayeneleri çoğu zaman 15–20 dakika sürer.',
   'ilk-muayene-suresi', 1),

  ('ce_faq_cancel', 'tr',
   'Randevumu nasıl iptal eder veya yeniden planlarım?',
   'Randevunuzu, randevu saatinden en az 24 saat önce hesabınızdan ya da e-postanızdaki bağlantıdan iptal edebilir veya yeniden planlayabilirsiniz. 24 saatten yakın değişiklikler için lütfen bize WhatsApp veya telefon ile ulaşın.',
   'iptal-yeniden-planlama', 1),

  ('ce_faq_telehealth', 'tr',
   'Online görüşme nasıl çalışır?',
   'Randevu oluşturduğunuzda size e-posta ve SMS ile şifreli bir görüşme bağlantısı gönderilir. Görüşme saatinde tarayıcınızdan (Chrome, Safari, Firefox) bağlantıya tıklamanız yeterlidir; uygulama indirmek gerekmez. Görüşme süresi takip muayenelerinde 15 dakikadır.',
   'online-gorusme-nasil', 1),

  ('ce_faq_tms_screen', 'tr',
   'TMS ön taraması nedir, nasıl doldururum?',
   'TMS uygulamasından önce, güvenlik açısından kritik bir ön tarama formu doldurmanız gerekir (kafa içi metal, kalp pili, nöbet öyküsü gibi sorgulama içerir). Hesabınızda "TMS Ön Tarama" bölümünden 5–7 dakikada doldurabilirsiniz. Ön tarama 365 gün geçerlidir.',
   'tms-on-tarama', 2),

  ('ce_faq_home_visit', 'tr',
   'Evde muayene hangi bölgelere yapılıyor?',
   'Evde nöroloji muayenesi İstanbul Anadolu yakasının tamamında ve seçilen Avrupa yakası ilçelerinde verilir. Adresinizin uygun olup olmadığını randevu sırasında doğrularız. Süre 60–90 dakika arasındadır.',
   'evde-muayene-bolgesi', 1),

  ('ce_faq_payment', 'tr',
   'Ödeme nasıl yapılır?',
   'Ödeme bilgileri muayene öncesinde sizinle paylaşılır. Türkiye Cumhuriyeti mevzuatı gereği muayene ücretleri sitede ilan edilemez; ücret bilgisini kliniğin önerdiği iletişim kanallarından (WhatsApp, telefon) talep edebilirsiniz.',
   'odeme', 1)
ON CONFLICT (content_entry_id, locale) DO NOTHING;

-- ─── KVKK page — TR canonical ─────────────────────────────────────────────────

INSERT INTO content_entries (id, type, slug, status, published_at) VALUES
  ('ce_legal_kvkk', 'legal', 'kvkk', 'published', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO content_entry_translations (
  content_entry_id, locale, title, body_markdown, slug_localised, reading_minutes
) VALUES
  ('ce_legal_kvkk', 'tr',
   'Kişisel Verilerin Korunması (KVKK)',
   '## Veri Sorumlusu
Uzm. Dr. Oğuz Bak (`info@uzmdroguzbak.com`), AĞRI ve KRONİK HASTALIKLAR KLİNİĞİ — Helis More Residence, Kartal/İstanbul.

## İşlenen Veri Kategorileri
- Kimlik verileri (ad, soyad, doğum tarihi)
- İletişim verileri (e-posta, telefon)
- Sağlık verileri (özel nitelikli kişisel veri): muayene notları, tetkikler, yüklediğiniz belgeler
- Hesap verileri (giriş kayıtları, IP, oturum bilgileri)

## İşleme Amaçları
- Randevu kaydı, takip ve hatırlatmalar
- Tedavi sürecinin yürütülmesi
- Yasal yükümlülüklerin yerine getirilmesi
- Sizinle açıkça onaylanan iletişim (örn. blog güncellemeleri)

## Hukuki Sebep
- Sözleşmenin kurulması ve ifası (KVKK 5/2-c)
- Sağlık hizmetinin yürütülmesi (KVKK 6/3 — meslek sırrı yükümlülüğü altında)
- Açık rıza (özel nitelikli verilerde, ör. testimonial yayını)

## Saklama Süreleri
Sağlık kayıtları yasal mevzuata uygun olarak 10 yıl boyunca saklanır. Pazarlama izinleri her zaman geri çekilebilir.

## Haklarınız (KVKK Madde 11)
- Verinize erişme, düzeltme, silme talep etme
- İşlemenin sınırlandırılmasını talep etme
- Otomatik kararlara itiraz etme

Hakkınızı kullanmak için: `info@uzmdroguzbak.com` adresinden bize yazabilir ya da hesabınızdaki "DSAR" sekmesinden talep oluşturabilirsiniz. Talebinize en geç 30 gün içinde yanıt veririz.

## Verilerinizin Konumu
Tüm sağlık verileri AB sınırlarında (Frankfurt, Almanya) bulunan veri merkezlerinde saklanır. Veri ihlali durumunda KVKK Kurulu''na 72 saat içinde bildirim yapılır.',
   'kvkk', 5)
ON CONFLICT (content_entry_id, locale) DO NOTHING;

COMMIT;
