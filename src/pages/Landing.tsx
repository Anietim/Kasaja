import { useNavigate } from 'react-router-dom'
import { ArrowRight, MessageCircle, Wallet, Bike, ShieldCheck, ShoppingBag, Store, UserRound } from 'lucide-react'
import { KasajaK } from '@/components/layout/KasajaLogo'

const CONTRACT = '0x3622512fC2717B207a45Ccd0cf7dF527e818Ce8C'
const EXAMPLE_TX = '0xd8339aaa78962c9f2468de351ef22b0adb794e603c6844814370b0ba24dd5a8d'
const EXPLORER_TX = `https://explorer.arc.io/tx/${EXAMPLE_TX}`

const ORANGE = '#FF6A13'
const CARD = { background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.08)' } as const

const STEPS = [
  { n: '01', icon: MessageCircle, title: 'Discover and chat', body: 'Browse listings, follow sellers and message them in real time before you buy.' },
  { n: '02', icon: Wallet, title: 'Pay in Naira', body: 'Paystack checkout. A signed webhook confirms payment, so nobody can mark their own order paid.' },
  { n: '03', icon: Bike, title: 'Rider delivers', body: 'Riders accept delivery jobs on the platform and carry the order from seller to buyer.' },
  { n: '04', icon: ShieldCheck, title: 'Confirm, on record', body: 'Tap confirm. The delivery is written to the Arc blockchain as a public receipt.' },
]

const ROLES = [
  { icon: ShoppingBag, title: 'Buyer', body: 'Find it, follow the seller, pay, confirm.' },
  { icon: Store, title: 'Seller', body: 'List products, chat with buyers, ship orders.' },
  { icon: UserRound, title: 'Independent', body: 'Your own storefront, no shop needed.' },
  { icon: Bike, title: 'Rider', body: 'Accept delivery jobs and earn per drop.' },
]

export default function Landing() {
  const navigate = useNavigate()
  const join = () => { void navigate('/login') }

  return (
    <div className="min-h-dvh bg-black text-white font-body relative overflow-hidden">
      <div aria-hidden className="absolute -top-40 left-1/2 -translate-x-1/3 w-[900px] h-[600px] pointer-events-none"
        style={{ background: 'radial-gradient(closest-side, rgba(255,106,19,0.20), transparent)' }} />
      <div aria-hidden className="absolute top-40 right-0 w-[500px] h-[500px] pointer-events-none"
        style={{ background: 'radial-gradient(closest-side, rgba(99,102,241,0.14), transparent)' }} />

      {/* Header */}
      <header className="relative max-w-6xl mx-auto px-5 md:px-10 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <KasajaK size={34} />
          <span className="font-display font-extrabold text-lg" style={{ letterSpacing: '0.16em' }}>KASAJA</span>
        </div>
        <nav className="hidden md:flex gap-8 text-[15px] font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>
          <a href="#how" className="hover:text-white">How it works</a>
          <a href="#roles" className="hover:text-white">Who it's for</a>
          <a href="#receipt" className="hover:text-white">Receipts</a>
          <a href="#status" className="hover:text-white">Status</a>
        </nav>
        <div className="flex gap-2.5">
          <button onClick={join} className="min-h-11 px-5 rounded-full text-sm font-semibold border border-white/15 hover:border-white/30">Log in</button>
          <button onClick={join} className="min-h-11 px-5 rounded-full text-sm font-bold text-black" style={{ background: ORANGE }}>Join</button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative max-w-6xl mx-auto px-5 md:px-10 pt-10 md:pt-16 pb-20 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <span className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full text-sm font-medium"
            style={{ border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)' }}>
            <span className="w-2 h-2 rounded-full" style={{ background: ORANGE }} />
            Naira-first marketplace for Nigeria
          </span>
          <h1 className="font-display font-extrabold tracking-tighter leading-[0.98] mt-7 mb-6 text-[52px] sm:text-[68px] md:text-[80px]">
            Buy it.<br />Get it.<br />
            <span style={{ color: ORANGE }}>It's on record.</span>
          </h1>
          <p className="text-lg leading-relaxed max-w-md mb-9" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Follow sellers, chat, pay in Naira. When your rider hands it over, the delivery is stamped as a public receipt. No wallet needed.
          </p>
          <div className="flex flex-wrap gap-3">
            <button onClick={join} className="min-h-14 px-8 rounded-full font-bold text-black flex items-center gap-2" style={{ background: ORANGE }}>
              Get started <ArrowRight size={18} />
            </button>
            <a href="#receipt" className="min-h-14 px-8 rounded-full font-semibold border border-white/15 flex items-center hover:border-white/30">See a real receipt</a>
          </div>
        </div>

        {/* Receipt card */}
        <div className="relative flex justify-center">
          <div className="w-full max-w-sm rounded-3xl p-6" style={{ background: '#F6F3F1', color: '#17110F', boxShadow: '0 40px 80px rgba(0,0,0,0.6)', transform: 'rotate(-2deg)' }}>
            <div className="flex justify-between items-center">
              <span className="font-mono text-[11px] tracking-widest" style={{ color: '#5A4E4A' }}>DELIVERY RECEIPT</span>
              <span className="text-[13px] font-bold" style={{ color: '#0F6B3F' }}>Confirmed</span>
            </div>
            <div className="my-4 h-px" style={{ background: 'repeating-linear-gradient(90deg,#B9ADA8 0 6px,transparent 6px 12px)' }} />
            <div className="flex justify-between text-sm mb-2"><span style={{ color: '#5A4E4A' }}>Recorded on</span><span className="font-bold">Arc</span></div>
            <div className="flex justify-between text-sm mb-2"><span style={{ color: '#5A4E4A' }}>Order</span><span className="font-mono text-[13px]">hashed, not named</span></div>
            <div className="flex justify-between text-sm"><span style={{ color: '#5A4E4A' }}>Personal data</span><span className="font-bold">None</span></div>
          </div>
        </div>
      </section>

      {/* Fact strip */}
      <section className="relative max-w-6xl mx-auto px-5 md:px-10">
        <div className="grid md:grid-cols-3 rounded-3xl overflow-hidden" style={CARD}>
          {[['PAY', 'In Naira, via Paystack'], ['DELIVER', 'By riders on the platform'], ['PROVE', 'Public receipt on Arc']].map(([k, v], i) => (
            <div key={k} className="px-8 py-6" style={i > 0 ? { borderTop: '1px solid rgba(255,255,255,0.08)' } : undefined}>
              <div className="text-[13px] font-bold tracking-widest" style={{ color: 'rgba(255,255,255,0.45)' }}>{k}</div>
              <div className="text-xl font-bold mt-2">{v}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="relative max-w-6xl mx-auto px-5 md:px-10 pt-28">
        <p className="text-[13px] font-bold tracking-[0.16em]" style={{ color: ORANGE }}>HOW IT WORKS</p>
        <h2 className="font-display font-extrabold tracking-tight leading-[1.05] mt-3 mb-12 text-4xl md:text-[52px] max-w-3xl">
          From the feed to your door, with a paper trail.
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STEPS.map(s => (
            <div key={s.n} className="rounded-3xl p-7" style={s.n === '04' ? { background: ORANGE, color: '#150700' } : CARD}>
              <div className="font-mono text-sm" style={{ color: s.n === '04' ? '#150700' : ORANGE }}>{s.n}</div>
              <s.icon size={26} className="mt-5" />
              <h3 className="text-xl font-bold mt-4 mb-2">{s.title}</h3>
              <p className="text-[15px] leading-relaxed" style={{ color: s.n === '04' ? '#2A1100' : 'rgba(255,255,255,0.6)' }}>{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Roles */}
      <section id="roles" className="relative max-w-6xl mx-auto px-5 md:px-10 pt-28">
        <p className="text-[13px] font-bold tracking-[0.16em]" style={{ color: ORANGE }}>PICK YOUR SIDE</p>
        <h2 className="font-display font-extrabold tracking-tight leading-[1.05] mt-3 mb-12 text-4xl md:text-[52px]">One app. Four ways to belong.</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {ROLES.map(r => (
            <button key={r.title} onClick={join} className="rounded-3xl p-7 text-left min-h-[200px] hover:border-white/25 transition-colors" style={CARD}>
              <span className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,106,19,0.14)' }}>
                <r.icon size={22} style={{ color: ORANGE }} />
              </span>
              <div className="text-[22px] font-bold mt-7 mb-2">{r.title}</div>
              <p className="text-[15px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>{r.body}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Receipts */}
      <section id="receipt" className="relative max-w-6xl mx-auto px-5 md:px-10 pt-28 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <p className="text-[13px] font-bold tracking-[0.16em]" style={{ color: ORANGE }}>PROOF, NOT PROMISES</p>
          <h2 className="font-display font-extrabold tracking-tight leading-[1.05] mt-3 mb-6 text-4xl md:text-[52px]">Every delivery leaves a mark anyone can check.</h2>
          <p className="text-[17px] leading-relaxed mb-4" style={{ color: 'rgba(255,255,255,0.6)' }}>
            The contract stores only a hash of the order ID and a timestamp. No names, no addresses, no money. Each order is recorded once, and only KASAJA's recorder wallet can write.
          </p>
          <p className="text-[17px] leading-relaxed mb-7" style={{ color: 'rgba(255,255,255,0.6)' }}>
            The contract is verified on Sourcify and the code is open.
          </p>
          <a href="https://github.com/Anietim/Kasaja" target="_blank" rel="noreferrer" className="inline-flex min-h-12 px-6 items-center rounded-full border border-white/15 font-semibold text-sm hover:border-white/30">
            Read the code on GitHub
          </a>
        </div>
        <div className="rounded-3xl p-px" style={{ background: `linear-gradient(135deg, ${ORANGE}, #6366F1)` }}>
          <div className="rounded-[23px] bg-[#050505] p-7 font-mono text-[13px] leading-7">
            <div className="mb-4" style={{ color: '#34D399' }}>KasajaDeliveryReceipts</div>
            <div style={{ color: 'rgba(255,255,255,0.45)' }}>contract</div>
            <div className="break-all mb-4">{CONTRACT}</div>
            <div style={{ color: 'rgba(255,255,255,0.45)' }}>example receipt tx</div>
            <a href={EXPLORER_TX} target="_blank" rel="noreferrer" className="break-all mb-4 block underline decoration-white/30 hover:decoration-white">{EXAMPLE_TX}</a>
            <div style={{ color: 'rgba(255,255,255,0.45)' }}>stores</div>
            <div style={{ color: ORANGE }}>hash(orderId) + timestamp</div>
          </div>
        </div>
      </section>

      {/* Status */}
      <section id="status" className="relative max-w-6xl mx-auto px-5 md:px-10 pt-28 pb-24">
        <div className="rounded-3xl p-8 md:p-10 flex flex-col md:flex-row md:items-center justify-between gap-8" style={CARD}>
          <div className="max-w-2xl">
            <p className="text-[13px] font-bold tracking-[0.16em]" style={{ color: ORANGE }}>HONEST STATUS</p>
            <h2 className="font-display font-extrabold tracking-tight text-3xl mt-2 mb-3">A working prototype, in testing.</h2>
            <p className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Paystack is in test mode and there are no paying customers yet. Wallet and stablecoin features wait for regulatory review. Come break it and tell me what to fix.
            </p>
          </div>
          <button onClick={join} className="min-h-14 px-8 rounded-full font-bold text-black whitespace-nowrap" style={{ background: ORANGE }}>Open the app</button>
        </div>
      </section>

      <footer className="relative border-t border-white/10">
        <div className="max-w-6xl mx-auto px-5 md:px-10 py-8 flex flex-col sm:flex-row gap-3 justify-between items-center text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
          <span className="font-display font-extrabold text-base text-white" style={{ letterSpacing: '0.16em' }}>KASAJA</span>
          <span>Built in Nigeria by Aniekan Etim</span>
        </div>
      </footer>
    </div>
  )
}
