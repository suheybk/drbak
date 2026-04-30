/**
 * Twilio SMS — used as fallback for non-TR numbers (medical-tourism patients).
 */

export interface TwilioSendInput {
  readonly toE164: string;
  readonly text: string;
  readonly idempotencyKey: string;
}

export class TwilioSmsClient {
  constructor(
    private readonly accountSid: string,
    private readonly authToken: string,
    private readonly from: string,
  ) {}

  async send(input: TwilioSendInput): Promise<{ providerMessageId: string }> {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    const body = new URLSearchParams({
      From: this.from,
      To: input.toE164,
      Body: input.text,
    });
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        authorization: `Basic ${btoa(`${this.accountSid}:${this.authToken}`)}`,
        'content-type': 'application/x-www-form-urlencoded',
        'i-twilio-idempotency-token': input.idempotencyKey,
      },
      body,
    });
    if (!res.ok) throw new TwilioError(`Twilio error: ${res.status} ${await res.text()}`, res.status);
    const json = (await res.json()) as { sid: string };
    return { providerMessageId: json.sid };
  }
}

export class TwilioError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'TwilioError';
  }
  get retryable(): boolean {
    return this.status >= 500 || this.status === 429;
  }
}
