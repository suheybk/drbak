/**
 * NetGSM (Türkiye) SMS adapter.
 * The sender header MUST be İYS-registered (Türkiye Ticari İletişim Yönetim Sistemi).
 *
 * Uses the OTP/standard endpoint:
 *   POST https://api.netgsm.com.tr/sms/rest/v2/send
 */

export interface SendSmsInput {
  readonly toE164: string;
  readonly text: string;
  readonly idempotencyKey: string;
}

export interface NetGsmSendResult {
  readonly providerMessageId: string;
}

export class NetGsmSmsClient {
  constructor(
    private readonly username: string,
    private readonly password: string,
    private readonly senderId: string,
  ) {}

  async send(input: SendSmsInput): Promise<NetGsmSendResult> {
    // NetGSM REST v2 expects E.164 without leading '+' for TR numbers
    const phone = input.toE164.replace(/^\+/, '');
    const payload = {
      msgheader: this.senderId,
      messages: [{ msg: input.text, no: phone }],
      iysfilter: '0', // 0 = no filtering (we manage opt-out ourselves via consents)
      partnercode: input.idempotencyKey.slice(0, 24), // NetGSM caps to 24 chars
      encoding: 'TR',
    };
    const res = await fetch('https://api.netgsm.com.tr/sms/rest/v2/send', {
      method: 'POST',
      headers: {
        authorization: `Basic ${btoa(`${this.username}:${this.password}`)}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok)
      throw new NetGsmError(`NetGSM error: ${res.status} ${await res.text()}`, res.status);
    const json = (await res.json()) as { jobid?: string; code?: string };
    if (json.code && json.code !== '00' && json.code !== '0') {
      throw new NetGsmError(`NetGSM declined: code=${json.code}`, 400);
    }
    return { providerMessageId: json.jobid ?? input.idempotencyKey };
  }
}

export class NetGsmError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'NetGsmError';
  }
  get retryable(): boolean {
    return this.status >= 500 || this.status === 429;
  }
}
