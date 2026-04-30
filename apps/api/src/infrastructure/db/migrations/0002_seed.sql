-- 0002_seed.sql — minimum data so the API + DoctorCatalogue work on first deploy.
--
-- What's seeded:
--   * One doctor row (Uzm. Dr. Oğuz Bak)             ← required by DoctorCatalogue
--   * One clinic row (AĞRI ve KRONİK HASTALIKLAR KLİNİĞİ)
--   * Five services (TMS, neurology consult, home visit, telehealth, IV)
--     with TR + EN translations
--
-- All rows are inserted with `ON CONFLICT (id) DO NOTHING` so this migration
-- is safe to re-run (idempotent). Production-only data (long body markdown,
-- DoctorNote pull-quotes, condition pages) is loaded later via the admin
-- `contentEntryWrite` use case — kept out of this migration so the SQL stays
-- reviewable.

BEGIN;

-- ─── Doctor (single row; multi-doctor expansion is a future migration) ─────────
INSERT INTO doctors (id, full_name, title_short, primary_specialty, sub_specialty, bio)
VALUES (
  'doc_oguz_bak',
  'Uzm. Dr. Oğuz Bak',
  'Uzm. Dr.',
  'Nöroloji',
  'Algoloji',
  'Aralık 1998 mezunu, 28 yıllık nöroloji ve algoloji yan dal deneyimi.'
)
ON CONFLICT (id) DO NOTHING;

-- ─── Clinic (one location for now; Kartal/İstanbul) ────────────────────────────
INSERT INTO clinics (
  id, brand_name, address_line1, district, city, country_iso2,
  phone_e164, whatsapp_e164, email
) VALUES (
  'clinic_kartal',
  'AĞRI ve KRONİK HASTALIKLAR KLİNİĞİ',
  'Helis More Residence',
  'Kartal',
  'İstanbul',
  'TR',
  '+905300874391',
  '+905300874391',
  'info@uzmdroguzbak.com'
)
ON CONFLICT (id) DO NOTHING;

-- ─── Services (5 marquee + supporting) ─────────────────────────────────────────
-- Slugs match marketing/landing-copy/<service>.{tr,en}.md filenames.
-- Pillar values are ours, not Schema.org — used for grouping in the IA.

INSERT INTO services (
  id, slug, pillar, duration_minutes, delivery_modes, requires_tms_screening,
  min_patient_age_years, max_patient_age_years, sort_order, published_at
) VALUES
  (
    'svc_tms', 'tms', 'tms',
    40,
    '["in_person"]'::jsonb,
    true,
    18, NULL, 10, now()
  ),
  (
    'svc_neuro_consult', 'neurology-consultation', 'integrative_neurology',
    40,
    '["in_person","telehealth"]'::jsonb,
    false,
    1, NULL, 20, now()
  ),
  (
    'svc_home_visit', 'home-visit', 'integrative_neurology',
    90,
    '["home_visit"]'::jsonb,
    false,
    1, NULL, 30, now()
  ),
  (
    'svc_telehealth', 'telehealth', 'integrative_neurology',
    15,
    '["telehealth"]'::jsonb,
    false,
    18, NULL, 40, now()
  ),
  (
    'svc_iv_therapy', 'iv-therapy', 'iv_therapy',
    60,
    '["in_person"]'::jsonb,
    false,
    18, NULL, 50, now()
  )
ON CONFLICT (id) DO NOTHING;

-- ─── Service translations (TR + EN canonical; AR/FR/ES inserted later via CMS) ─
-- Body markdown is a short lead only; full landing copy in
-- marketing/landing-copy/* is loaded via contentEntryWrite when the CMS is
-- bootstrapped. This keeps the migration small and reviewable.

INSERT INTO service_translations (service_id, locale, title, lead_paragraph, slug_localised) VALUES
  -- TR
  ('svc_tms',            'tr', 'TMS — Transkranial Manyetik Stimülasyon',
   'Manyetik darbelerle beyindeki belirli bölgelerin uyarımı; ilaçsız, kanıta dayalı bir tedavi seçeneği.',
   'tms'),
  ('svc_neuro_consult',  'tr', 'Nöroloji Muayenesi',
   '28 yıllık deneyimle, sizi sadece belirtinizle değil geçmişinizle birlikte değerlendiren bir muayene.',
   'noroloji-muayenesi'),
  ('svc_home_visit',     'tr', 'Evde Nöroloji Muayenesi',
   'Hareket güçlüğü olan veya hastaneye gelmesi zor olan hastalar için, kendi evinde tam bir değerlendirme.',
   'evde-noroloji-muayenesi'),
  ('svc_telehealth',     'tr', 'Online Görüşme (Telesağlık)',
   'İlk muayene sonrası takip, ilaç dozu ayarlama, tetkik sonuçlarını birlikte değerlendirme.',
   'online-gorusme'),
  ('svc_iv_therapy',     'tr', 'IV Terapi',
   'Hekim değerlendirmesi sonrası, uygun hastalarda uygulanan IV protokolleri — abartılı vaatler olmadan.',
   'iv-terapi'),
  -- EN
  ('svc_tms',            'en', 'TMS — Transcranial Magnetic Stimulation',
   'Magnetic pulses targeting specific cortical regions; an evidence-based, drug-free treatment option.',
   'tms'),
  ('svc_neuro_consult',  'en', 'Neurology Consultation',
   '28 years of practice, in a consultation that listens to your history — not just your symptom.',
   'neurology-consultation'),
  ('svc_home_visit',     'en', 'Home Neurology Visits',
   'A full neurology assessment in your own home — for patients who can''t easily come to clinic.',
   'home-visit'),
  ('svc_telehealth',     'en', 'Telehealth (Online Consultation)',
   'Follow-up, medication adjustment, and reviewing test results together — without an in-person visit.',
   'telehealth'),
  ('svc_iv_therapy',     'en', 'IV Therapy',
   'IV protocols, after medical assessment, in patients for whom they are appropriate — without overstatement.',
   'iv-therapy')
ON CONFLICT (service_id, locale) DO NOTHING;

COMMIT;
