/**
 * ChatWidget — bottom-right floating chat for the Tier-2 AI assistant.
 *
 * - Lazy-mounted from BaseLayout via `client:idle`; not loaded until
 *   the user has scrolled / interacted, so first-paint stays fast.
 * - Anonymous sessions OK (FAQ + service-info tools work without auth).
 *   Authenticated patients automatically get personalised tools (the
 *   server resolves the JWT cookie and links the chat session to the
 *   patient_id during /chat/sessions create).
 * - Uses the existing `serverFetch`-style API client; falls back to
 *   relative URLs when running on the same origin.
 *
 * UX rules:
 * - Closed: round button bottom-right (RTL-aware via inset-inline-end).
 * - Open: 360px-wide panel; mobile-bottom-sheet under 600px.
 * - Empty state: greeting + 3 quick-prompt chips (TR/EN/AR/FR/ES).
 * - Each turn: user bubble + assistant bubble + tool-call breadcrumb
 *   ("Asistan: hizmet listesi sorgulandı").
 * - Closing line is enforced by the system prompt server-side; widget
 *   just renders what it gets.
 */

import { type FormEvent, type ReactElement, useEffect, useRef, useState } from 'react';

interface ChatWidgetProps {
  readonly locale: 'tr' | 'ar' | 'en' | 'fr' | 'es';
  readonly apiBase: string;
  readonly consentVersion: string;
}

interface Message {
  readonly id: string;
  readonly role: 'user' | 'assistant' | 'system';
  readonly text: string;
  readonly tools?: ReadonlyArray<string>;
}

interface Strings {
  open: string;
  title: string;
  subtitle: string;
  placeholder: string;
  send: string;
  close: string;
  empty: string;
  consent: string;
  error: string;
  quick1: string;
  quick2: string;
  quick3: string;
  disclaimer: string;
}

const T: Record<ChatWidgetProps['locale'], Strings> = {
  tr: {
    open: 'Asistana Sor',
    title: 'Klinik Asistanı',
    subtitle: 'Sorularınızı yanıtlamaya yardımcıyım',
    placeholder: 'Bir şey sorun…',
    send: 'Gönder',
    close: 'Kapat',
    empty:
      'Merhaba. Klinik hizmetleri, tedaviler ve randevu süreci hakkında size yardımcı olabilirim.',
    consent:
      'Yazışma içeriği KVKK Madde 6 kapsamında özel nitelikli sağlık verisi olarak işlenir. Devam ederek bu işlemeyi kabul edersiniz.',
    error: 'Asistan şu an cevap veremiyor. Birazdan tekrar deneyin.',
    quick1: 'TMS nedir?',
    quick2: 'Evde hizmet veriyor musunuz?',
    quick3: 'Randevu nasıl alırım?',
    disclaimer: 'Bu bir tıbbi tavsiye değildir. Tam değerlendirme için Dr. Bak ile randevu alın.',
  },
  en: {
    open: 'Ask the Assistant',
    title: 'Clinic Assistant',
    subtitle: 'Here to help with your questions',
    placeholder: 'Ask something…',
    send: 'Send',
    close: 'Close',
    empty:
      'Hello. I can help with information about clinic services, treatments, and appointment scheduling.',
    consent:
      'Conversation content is processed as special-category health data under KVKK Article 6. By continuing you accept this processing.',
    error: 'Assistant cannot respond right now. Please try again shortly.',
    quick1: 'What is TMS?',
    quick2: 'Do you offer home visits?',
    quick3: 'How do I book?',
    disclaimer:
      'This is not medical advice. Please book an appointment with Dr. Bak for a full evaluation.',
  },
  ar: {
    open: 'اسأل المساعد',
    title: 'مساعد العيادة',
    subtitle: 'لمساعدتك في أسئلتك',
    placeholder: 'اطرح سؤالاً…',
    send: 'إرسال',
    close: 'إغلاق',
    empty: 'مرحبًا. أساعدك في معلومات الخدمات والعلاجات وحجز المواعيد.',
    consent: 'يُعالج محتوى المحادثة كبيانات صحية ذات طبيعة خاصة وفق المادة 6 من قانون KVKK.',
    error: 'لا يمكن للمساعد الرد الآن. حاول مرة أخرى قريبًا.',
    quick1: 'ما هو TMS؟',
    quick2: 'هل تقدمون زيارات منزلية؟',
    quick3: 'كيف أحجز موعدًا؟',
    disclaimer: 'هذه ليست نصيحة طبية. يُرجى حجز موعد مع د. باك للتقييم الكامل.',
  },
  fr: {
    open: "Demander à l'assistant",
    title: 'Assistant clinique',
    subtitle: 'Pour vous aider avec vos questions',
    placeholder: 'Posez une question…',
    send: 'Envoyer',
    close: 'Fermer',
    empty: 'Bonjour. Je peux vous renseigner sur les soins, traitements et rendez-vous.',
    consent:
      'Le contenu de la conversation est traité comme donnée de santé sensible selon la KVKK article 6.',
    error: "L'assistant ne peut pas répondre. Réessayez plus tard.",
    quick1: 'Qu’est-ce que la TMS ?',
    quick2: 'Faites-vous des visites à domicile ?',
    quick3: 'Comment prendre rendez-vous ?',
    disclaimer: "Ceci n'est pas un avis médical. Veuillez prendre rendez-vous avec le Dr Bak.",
  },
  es: {
    open: 'Preguntar al asistente',
    title: 'Asistente de la clínica',
    subtitle: 'Para ayudarte con tus preguntas',
    placeholder: 'Haz una pregunta…',
    send: 'Enviar',
    close: 'Cerrar',
    empty: 'Hola. Puedo ayudarte con información sobre servicios, tratamientos y citas.',
    consent:
      'El contenido de la conversación se trata como dato de salud sensible según el artículo 6 de la KVKK.',
    error: 'El asistente no puede responder ahora. Inténtalo en un momento.',
    quick1: '¿Qué es la TMS?',
    quick2: '¿Hacen visitas a domicilio?',
    quick3: '¿Cómo reservo cita?',
    disclaimer: 'Esto no es un consejo médico. Por favor, reserve cita con el Dr. Bak.',
  },
};

const idgen = (): string => globalThis.crypto?.randomUUID?.() ?? `m_${Date.now()}_${Math.random()}`;

export default function ChatWidget({
  locale,
  apiBase,
  consentVersion,
}: ChatWidgetProps): ReactElement {
  const t = T[locale];
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [consented, setConsented] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-scroll when a new message lands
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const ensureSession = async (): Promise<string | null> => {
    if (sessionId) return sessionId;
    try {
      const res = await fetch(`${apiBase}/chat/sessions`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale, consentVersion }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { sessionId: string };
      setSessionId(data.sessionId);
      return data.sessionId;
    } catch {
      return null;
    }
  };

  const send = async (text: string): Promise<void> => {
    if (!text.trim() || pending) return;
    if (!consented) return;
    setPending(true);

    const userMsg: Message = { id: idgen(), role: 'user', text };
    setMessages((m) => [...m, userMsg]);
    setInput('');

    const sid = await ensureSession();
    if (!sid) {
      setMessages((m) => [...m, { id: idgen(), role: 'system', text: t.error }]);
      setPending(false);
      return;
    }

    try {
      const res = await fetch(`${apiBase}/chat/sessions/${sid}/messages`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as {
        reply: string;
        toolsUsed?: ReadonlyArray<string>;
      };
      setMessages((m) => [
        ...m,
        {
          id: idgen(),
          role: 'assistant',
          text: data.reply,
          ...(data.toolsUsed && data.toolsUsed.length > 0 ? { tools: data.toolsUsed } : {}),
        },
      ]);
    } catch {
      setMessages((m) => [...m, { id: idgen(), role: 'system', text: t.error }]);
    } finally {
      setPending(false);
    }
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    void send(input);
  };

  const grantConsent = (): void => setConsented(true);

  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  if (!open) {
    return (
      <button
        type="button"
        className="chat-widget__fab"
        aria-label={t.open}
        onClick={() => setOpen(true)}
      >
        <span aria-hidden="true">💬</span>
        <span className="chat-widget__fab-label">{t.open}</span>
      </button>
    );
  }

  return (
    // biome-ignore lint/a11y/useSemanticElements: needs to remain a div so position:fixed works around the modal not being top-layer in older browsers
    <div className="chat-widget" role="dialog" aria-label={t.title} dir={dir}>
      <div className="chat-widget__head">
        <div>
          <p className="chat-widget__title">{t.title}</p>
          <p className="chat-widget__subtitle">{t.subtitle}</p>
        </div>
        <button
          type="button"
          className="chat-widget__close"
          aria-label={t.close}
          onClick={() => setOpen(false)}
        >
          ×
        </button>
      </div>

      <div className="chat-widget__body" ref={scrollRef}>
        {!consented ? (
          <div className="chat-widget__consent">
            <p>{t.consent}</p>
            <button type="button" className="chat-widget__consent-btn" onClick={grantConsent}>
              {t.send}
            </button>
          </div>
        ) : messages.length === 0 ? (
          <div className="chat-widget__empty">
            <p>{t.empty}</p>
            <div className="chat-widget__quick">
              {[t.quick1, t.quick2, t.quick3].map((q) => (
                <button
                  type="button"
                  key={q}
                  className="chat-widget__quick-btn"
                  onClick={() => void send(q)}
                  disabled={pending}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ul className="chat-widget__msgs">
            {messages.map((m) => (
              <li key={m.id} className={`chat-widget__msg chat-widget__msg--${m.role}`}>
                <p>{m.text}</p>
                {m.tools && m.tools.length > 0 && (
                  <p className="chat-widget__tools">
                    {m.tools.map((tn) => (
                      <span key={tn} className="chat-widget__tool-chip">
                        {tn}
                      </span>
                    ))}
                  </p>
                )}
              </li>
            ))}
            {pending && (
              <li className="chat-widget__msg chat-widget__msg--assistant chat-widget__msg--pending">
                <p>…</p>
              </li>
            )}
          </ul>
        )}
      </div>

      {consented && (
        <form className="chat-widget__form" onSubmit={onSubmit}>
          <input
            type="text"
            className="chat-widget__input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t.placeholder}
            disabled={pending}
            aria-label={t.placeholder}
          />
          <button type="submit" className="chat-widget__send" disabled={pending || !input.trim()}>
            {t.send}
          </button>
        </form>
      )}

      <p className="chat-widget__disclaimer">{t.disclaimer}</p>
    </div>
  );
}
