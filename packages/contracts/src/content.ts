import { z } from 'zod';
import { LocaleSchema } from './locale.js';

export const ContentTypeSchema = z.enum(['blog', 'condition', 'service', 'faq', 'guide', 'legal']);
export type ContentType = z.infer<typeof ContentTypeSchema>;

export const ContentEntrySummarySchema = z.object({
  id: z.string(),
  type: ContentTypeSchema,
  slug: z.string(),
  slugLocalised: z.string(),
  title: z.string(),
  leadParagraph: z.string().nullable(),
  publishedAt: z.string().datetime().nullable(),
  readingMinutes: z.number().int().positive().nullable(),
  ogImageUrl: z.string().url().nullable(),
});
export type ContentEntrySummary = z.infer<typeof ContentEntrySummarySchema>;

export const ContentEntryDetailSchema = ContentEntrySummarySchema.extend({
  bodyMarkdown: z.string(),
  doctorNoteMarkdown: z.string().nullable(),
  metaDescription: z.string().nullable(),
  schemaJsonLd: z.record(z.unknown()).nullable(),
  // Reciprocal locale slugs for hreflang
  alternateLocales: z.array(z.object({ locale: LocaleSchema, slugLocalised: z.string() })),
  relatedConditionSlugs: z.array(z.string()),
  relatedServiceSlugs: z.array(z.string()),
});
export type ContentEntryDetail = z.infer<typeof ContentEntryDetailSchema>;

export const ListContentQuerySchema = z.object({
  type: ContentTypeSchema.optional(),
  locale: LocaleSchema,
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});
export type ListContentQuery = z.infer<typeof ListContentQuerySchema>;

export const TestimonialPublicSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  locale: LocaleSchema,
  quoteMarkdown: z.string(),
  conditionSlug: z.string().nullable(),
  serviceSlug: z.string().nullable(),
  hasMedia: z.boolean(),
  approvedAt: z.string().datetime(),
});
export type TestimonialPublic = z.infer<typeof TestimonialPublicSchema>;
