/**
 * Meta Cloud API direct WhatsApp adapter.
 * Sends a *template* message (only templates are deliverable to non-conversation users).
 *
 * Templates we ship at launch:
 *   - appointment_confirmation_v1     (params: name, service, datetime)
 *   - appointment_reminder_24h_v1
 *   - appointment_reminder_1h_v1
 *   - appointment_cancelled_v1
 *
 * The template name + locale must be approved in Meta Business Manager beforehand.
 */

export interface SendWhatsappInput {
  readonly toE164: string;
  readonly templateName: string;
  readonly locale: string; // e.g., 'tr_TR', 'ar_SA', 'en_US', 'fr_FR', 'es_ES'
  readonly bodyParams: ReadonlyArray<string>;
  readonly idempotencyKey: string;
}

export class MetaWhatsappClient {
  constructor(
    private readonly accessToken: string,
    private readonly phoneNumberId: string,
  ) {}

  async send(input: SendWhatsappInput): Promise<{ providerMessageId: string }> {
    const url = `https://graph.facebook.com/v20.0/${this.phoneNumberId}/messages`;
    const body = {
      messaging_product: 'whatsapp',
      to: input.toE164.replace(/^\+/, ''),
      type: 'template',
      biz_opaque_callback_data: input.idempotencyKey, // surfaced in delivery webhooks
      template: {
        name: input.templateName,
        language: { code: input.locale },
        components: [
          {
            type: 'body',
            parameters: input.bodyParams.map((p) => ({ type: 'text', text: p })),
          },
        ],
      },
    };
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new MetaWhatsappError(
        `Meta WA error: ${res.status} ${await res.text()}`,
        res.status,
      );
    }
    const json = (await res.json()) as { messages: Array<{ id: string }> };
    return { providerMessageId: json.messages[0]?.id ?? input.idempotencyKey };
  }
}

export class MetaWhatsappError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'MetaWhatsappError';
  }
  get retryable(): boolean {
    return this.status >= 500 || this.status === 429;
  }
}
