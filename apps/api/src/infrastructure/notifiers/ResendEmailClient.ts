/**
 * Resend.com adapter — actual SMTP-over-HTTPS sender.
 * Used by the notification queue consumer, NOT by use cases directly.
 */

export interface SendEmailInput {
  readonly to: string;
  readonly from: string;
  readonly subject: string;
  readonly html: string;
  readonly text: string;
  readonly replyTo?: string;
  readonly icsAttachment?: { filename: string; content: string };
  readonly idempotencyKey: string; // Resend supports it natively
}

export interface ResendSendResult {
  readonly providerMessageId: string;
}

export class ResendEmailClient {
  constructor(private readonly apiKey: string) {}

  async send(input: SendEmailInput): Promise<ResendSendResult> {
    const body: Record<string, unknown> = {
      from: input.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    };
    if (input.replyTo) body.reply_to = input.replyTo;
    if (input.icsAttachment) {
      body.attachments = [
        {
          filename: input.icsAttachment.filename,
          content: input.icsAttachment.content,
        },
      ];
    }
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        'content-type': 'application/json',
        'idempotency-key': input.idempotencyKey,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new ResendError(`Resend API error: ${res.status} ${await res.text()}`, res.status);
    }
    const json = (await res.json()) as { id: string };
    return { providerMessageId: json.id };
  }
}

export class ResendError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ResendError';
  }
  /** 5xx and 429 are retryable; 4xx are not. */
  get retryable(): boolean {
    return this.status >= 500 || this.status === 429;
  }
}
