# Landing copy

One file per service per locale. The TR + EN files are canonical (final
voice, ready for OB sign-off). AR/FR/ES files are first-pass placeholders
flagged `STATUS: needs medical-translator review` — do not publish until
the reviewer signs off.

| Service | Slug | TR | EN | AR | FR | ES |
|---|---|---|---|---|---|---|
| TMS (marquee pillar) | `tms` | ✅ canonical | ✅ canonical | placeholder | placeholder | placeholder |
| Neurology consultation | `neurology-consultation` | ✅ canonical | ✅ canonical | placeholder | placeholder | placeholder |
| Home visit | `home-visit` | ✅ canonical | ✅ canonical | placeholder | placeholder | placeholder |
| Telehealth | `telehealth` | ✅ canonical | ✅ canonical | placeholder | placeholder | placeholder |
| IV therapy | `iv-therapy` | ✅ canonical | ✅ canonical | placeholder | placeholder | placeholder |

## Source mapping

These files are seeded into the CMS as `content_entries` rows of `type =
'service'` and `content_entry_translations` rows per locale. The admin
`contentEntryWrite` use-case enforces locale parity: every TR `service` row
must have at least one published translation when surfaced publicly.

`apps/web/src/views/ServiceDetailPage.astro` reads
`/public/content/service/<slug>` and renders `bodyMarkdown` +
`doctorNoteMarkdown` exactly as written here.

## Editorial template (mirrors `docs/discovery.md` §3 first-party voice)

```
1. Hero        — H1 + 1-sentence lead
2. What is X?  — mechanism-first
3. Who it's for
4. Who it isn't for       ← the trust signal: contraindications, named honestly
5. What a session feels like
6. Pre-visit prep + after-care
7. Evidence summary
8. <DoctorNote>            ← first-party voice closing block
9. Booking CTA (soft)
```

## Compliance gates

Every file complies with TR Sağlık Bakanlığı 2018 Tanıtım Yönetmeliği:

- No superlatives, no comparative claims
- No fee-listing
- No "guaranteed result"
- No banned words: *mucize, garantili, %100 başarı, Türkiye'nin en iyisi, son teknoloji*
- Mechanism-first explanations (per info.txt voice)
- Side effects and contraindications named honestly

## SEO targets per file (TR)

| Slug | Primary KW | Secondary KW |
|---|---|---|
| `tms` | tms tedavisi istanbul | manyetik beyin uyarımı, transkranial manyetik stimülasyon |
| `neurology-consultation` | nöroloji muayene istanbul kartal | nöroloji uzmanı kartal, baş ağrısı muayene |
| `home-visit` | evde nöroloji muayenesi istanbul | evde EEG, evde uyku testi |
| `telehealth` | online nöroloji görüşmesi | telesağlık nöroloji |
| `iv-therapy` | iv terapi istanbul | myers cocktail, glutatyon iv |
