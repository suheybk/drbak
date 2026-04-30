import type { Locale } from '@dr-bak/contracts';
import type { CorrelationId } from '../../domain/shared/ids.js';

export interface OutboundEmail {
  readonly toEmail: string;
  readonly locale: Locale;
  readonly template: string;
  readonly payload: Record<string, unknown>;
  readonly correlationId: CorrelationId;
  readonly icsAttachment?: { filename: string; content: string };
}

export interface EmailNotifier {
  enqueue(message: OutboundEmail): Promise<void>;
}

export interface OutboundSms {
  readonly toPhoneE164: string;
  readonly locale: Locale;
  readonly template: string;
  readonly payload: Record<string, unknown>;
  readonly correlationId: CorrelationId;
}

export interface SmsNotifier {
  enqueue(message: OutboundSms): Promise<void>;
}

export interface OutboundWhatsapp {
  readonly toPhoneE164: string;
  readonly locale: Locale;
  readonly template: string;
  readonly payload: Record<string, unknown>;
  readonly correlationId: CorrelationId;
}

export interface WhatsappNotifier {
  enqueue(message: OutboundWhatsapp): Promise<void>;
}
