/**
 * SupportChat — a floating "Chat with Support Agent" widget.
 *
 * The agent is simulated client-side: replies are chosen by keyword matching
 * with a realistic typing delay. No backend round-trip — but it reads and feels
 * like a real live-chat so it satisfies the "Chat with Support Agent" use case
 * for demos. For real chat, swap `botReply()` for a websocket/API call.
 */
import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';

const AGENT = { name: 'Maya', title: 'VOGUE Support' };

const QUICK_REPLIES = [
  'Where is my order?',
  'How do I return an item?',
  'What payment methods do you accept?',
  'Track my delivery',
];

// Keyword → canned reply. First match wins; falls back to a generic reply.
const RULES = [
  { kw: ['where', 'track', 'delivery', 'order status', 'shipped', 'arrive'],
    reply: "You can track any order in real time under Account → My Orders → tap the order. You'll see the live status, your rider, and the estimated delivery date. 📦" },
  { kw: ['return', 'refund', 'exchange', 'send back'],
    reply: "Easy! Open the delivered order under Account → My Orders and tap 'Request Return / Refund / Exchange'. We accept returns within 30 days. ↩️" },
  { kw: ['payment', 'pay', 'card', 'easypaisa', 'cod', 'cash'],
    reply: "We accept Cash on Delivery, Easypaisa, and Credit/Debit cards. All card payments are secured with 256-bit SSL. 🔒" },
  { kw: ['cancel'],
    reply: "You can cancel an order any time before it ships — just open the order and tap 'Cancel Order'. Once it's shipped, you'd use a return instead." },
  { kw: ['coupon', 'discount', 'promo', 'code', 'sale'],
    reply: "Apply your coupon code at checkout in the 'Discount Code' box. New here? Use WELCOME15 for 15% off your first order! 🎉" },
  { kw: ['size', 'fit', 'measurement'],
    reply: "Each product page lists available sizes. If it doesn't fit, you can exchange it free within 30 days of delivery." },
  { kw: ['delivery charge', 'shipping cost', 'free delivery', 'shipping fee'],
    reply: "Delivery is FREE on orders over PKR 2,000. Most orders arrive within 3–5 business days across Pakistan. 🚚" },
  { kw: ['hello', 'hi', 'hey', 'salam', 'assalam'],
    reply: "Hello! 👋 How can I help you today? You can ask about orders, returns, payments, or delivery." },
  { kw: ['thank', 'thanks', 'shukria'],
    reply: "You're most welcome! 💖 Is there anything else I can help you with?" },
  { kw: ['human', 'agent', 'person', 'real', 'call'],
    reply: "Of course — our team is on +92 42 111 86483 (Mon–Sat, 9am–9pm), or email support@vogue.pk. You can also use our Contact page for a detailed request." },
];

function botReply(text) {
  const t = text.toLowerCase();
  for (const rule of RULES) {
    if (rule.kw.some((k) => t.includes(k))) return rule.reply;
  }
  return "Thanks for reaching out! I've noted that down. For anything detailed, our team replies fast via the Contact page, or call +92 42 111 86483. Is there anything else I can help with? 😊";
}

let idSeq = 0;
const mkMsg = (from, text) => ({ id: ++idSeq, from, text, at: new Date() });

export default function SupportChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    mkMsg('agent', `Hi! I'm ${AGENT.name} from ${AGENT.title}. 👋 How can I help you today?`),
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typing, open]);

  function send(text) {
    const trimmed = (text ?? input).trim();
    if (!trimmed) return;
    setMessages((m) => [...m, mkMsg('user', trimmed)]);
    setInput('');
    setTyping(true);
    const delay = 700 + Math.min(1600, trimmed.length * 30);
    setTimeout(() => {
      setTyping(false);
      setMessages((m) => [...m, mkMsg('agent', botReply(trimmed))]);
    }, delay);
  }

  return (
    <>
      {/* Launcher */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Chat with support"
        className="fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-transform hover:scale-105"
        style={{ background: 'linear-gradient(135deg,#EC6EAD,#7b5ea7)', boxShadow: '0 8px 30px rgba(236,110,173,0.5)' }}
      >
        {open ? (
          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.8L3 20l1.3-3.9A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 right-5 z-40 w-[360px] max-w-[calc(100vw-2.5rem)] rounded-2xl overflow-hidden shadow-2xl flex flex-col"
          style={{ height: 480, background: '#fff', border: '1px solid #eee' }}>
          {/* Header */}
          <div className="px-4 py-3 flex items-center gap-3 text-white"
            style={{ background: 'linear-gradient(135deg,#EC6EAD,#7b5ea7)' }}>
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-white/25 flex items-center justify-center font-bold">{AGENT.name[0]}</div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm leading-tight">{AGENT.name}</p>
              <p className="text-[11px] text-white/80">{AGENT.title} · Online</p>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2.5" style={{ background: '#faf9fb' }}>
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-3.5 py-2 rounded-2xl text-sm leading-snug ${
                  m.from === 'user'
                    ? 'text-white rounded-br-md'
                    : 'bg-white text-neutral-700 rounded-bl-md border border-neutral-100'
                }`}
                  style={m.from === 'user' ? { background: 'linear-gradient(135deg,#EC6EAD,#7b5ea7)' } : {}}>
                  {m.text}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex justify-start">
                <div className="bg-white border border-neutral-100 rounded-2xl rounded-bl-md px-4 py-3 flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="w-1.5 h-1.5 rounded-full bg-neutral-300 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick replies */}
          {messages.length <= 2 && !typing && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5" style={{ background: '#faf9fb' }}>
              {QUICK_REPLIES.map((q) => (
                <button key={q} onClick={() => send(q)}
                  className="text-[11px] px-2.5 py-1.5 rounded-full border border-brand-200 text-brand-600 bg-white hover:bg-brand-50 transition-colors">
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form onSubmit={(e) => { e.preventDefault(); send(); }}
            className="p-2.5 border-t border-neutral-100 flex items-center gap-2 bg-white">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message…"
              className="flex-1 px-3 py-2 rounded-full text-sm bg-neutral-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-200 transition"
            />
            <button type="submit" aria-label="Send"
              className="w-9 h-9 rounded-full flex items-center justify-center text-white flex-shrink-0 disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg,#EC6EAD,#7b5ea7)' }} disabled={!input.trim()}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </form>

          <Link to="/contact" onClick={() => setOpen(false)}
            className="text-center text-[11px] text-neutral-400 hover:text-brand-600 py-1.5 bg-white border-t border-neutral-50">
            Need detailed help? Open the Contact page →
          </Link>
        </div>
      )}
    </>
  );
}
