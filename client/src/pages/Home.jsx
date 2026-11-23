import { Link, Navigate } from 'react-router-dom';
import {
  Sprout,
  Store,
  ClipboardList,
  BarChart3,
  Bot,
  ShieldCheck,
  ArrowRight,
  CloudSun,
  TrendingUp,
  CheckCircle2,
  Bell,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { BrandLogo, ThemeToggle } from '../components/AppLayout.jsx';

const FEATURES = [
  { icon: Sprout, tone: 'green', title: 'Crop advisory', text: 'Season-aware sowing windows, irrigation schedules and fertilizer advice tuned to your soil and water source.' },
  { icon: Store, tone: 'blue', title: 'Direct marketplace', text: 'List produce and sell straight to buyers. Fair prices, no middlemen, live stock tracking.' },
  { icon: ClipboardList, tone: 'amber', title: 'Smart field reports', text: 'Describe a problem in plain words. It is auto-classified by category and severity, then tracked to resolution.' },
  { icon: BarChart3, tone: 'violet', title: 'Analytics', text: 'Revenue, order trends, harvest yields and report breakdowns, all in one dashboard.' },
  { icon: Bot, tone: 'green', title: 'AI assistant', text: 'Ask questions about your own farm, orders and reports and get answers grounded in your data.' },
  { icon: ShieldCheck, tone: 'red', title: 'Moderated & secure', text: 'JWT auth, role-based access, and an admin console that keeps listings and reports in check.' },
];

const STEPS = [
  { title: 'Set up your farm', text: 'Add your location, soil, irrigation and plots in a couple of minutes.' },
  { title: 'Grow with guidance', text: 'Track crop cycles and get advisories for every plot.' },
  { title: 'Sell & track', text: 'List your harvest, accept orders and follow every delivery.' },
];

export default function Home() {
  const { user, loading } = useAuth();
  if (!loading && user) return <Navigate to="/dashboard" replace />;

  return (
    <div>
      <nav className="public-nav">
        <BrandLogo />
        <div className="links">
          <ThemeToggle />
          <Link to="/login" className="btn btn-ghost">Log in</Link>
          <Link to="/register" className="btn">Get started</Link>
        </div>
      </nav>

      <section className="hero">
        <div>
          <span className="eyebrow"><Sprout size={14} /> Built for Indian farmers & buyers</span>
          <h1>
            Grow smarter.<br />
            Sell <em>directly.</em>
          </h1>
          <p className="lead">
            AgriConnect brings crop advisory, field issue tracking and a farm-to-market marketplace together,
            so farmers get better yields and fairer prices.
          </p>
          <div className="row wrap">
            <Link to="/register" className="btn btn-lg">
              Create free account <ArrowRight size={18} />
            </Link>
            <Link to="/login" className="btn btn-lg btn-secondary">Try the demo</Link>
          </div>
          <div className="row wrap" style={{ marginTop: '1.5rem', gap: '1.25rem' }}>
            {['No middlemen', 'Works without AI keys', 'Mobile friendly'].map((t) => (
              <span key={t} className="row muted" style={{ gap: '0.35rem', fontSize: '0.88rem' }}>
                <CheckCircle2 size={16} color="var(--brand-600)" /> {t}
              </span>
            ))}
          </div>
        </div>

        <div className="hero-visual" aria-hidden="true">
          <div className="hero-card">
            <div className="row-between" style={{ marginBottom: '1rem' }}>
              <div>
                <div className="subtle">This season's revenue</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.03em' }}>₹1,03,150</div>
              </div>
              <span className="badge tone-green"><TrendingUp size={13} /> +18%</span>
            </div>
            <svg viewBox="0 0 320 110" width="100%" height="110">
              <defs>
                <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="var(--brand-500)" stopOpacity="0.35" />
                  <stop offset="1" stopColor="var(--brand-500)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0 90 L40 78 L80 82 L120 60 L160 66 L200 40 L240 48 L280 22 L320 28 L320 110 L0 110Z" fill="url(#g)" />
              <path d="M0 90 L40 78 L80 82 L120 60 L160 66 L200 40 L240 48 L280 22 L320 28" fill="none" stroke="var(--brand-600)" strokeWidth="3" strokeLinejoin="round" />
            </svg>
            <div className="stack-sm" style={{ marginTop: '0.75rem' }}>
              {[['🍅', 'Tomato', '1,200 kg', '₹22/kg'], ['🌾', 'Ragi', '25 quintal', '₹3,800/q'], ['🧅', 'Onion', '80 quintal', '₹2,400/q']].map(([e, n, q, p]) => (
                <div key={n} className="row" style={{ padding: '0.55rem 0.7rem', borderRadius: 10, background: 'var(--surface-2)' }}>
                  <span style={{ fontSize: '1.3rem' }}>{e}</span>
                  <div className="grow">
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{n}</div>
                    <div className="subtle">{q} available</div>
                  </div>
                  <strong style={{ fontSize: '0.9rem' }}>{p}</strong>
                </div>
              ))}
            </div>
          </div>
          <div className="hero-float" style={{ top: -44, left: -40 }}>
            <span className="stat-icon tone-blue" style={{ width: 34, height: 34 }}><CloudSun size={18} /></span>
            <div><strong>Rabi season</strong><div className="subtle">Sow wheat & mustard now</div></div>
          </div>
          <div className="hero-float" style={{ bottom: -20, right: -24 }}>
            <span className="stat-icon tone-amber" style={{ width: 34, height: 34 }}><Bell size={18} /></span>
            <div><strong>New order</strong><div className="subtle">100 kg Tomato · ₹2,200</div></div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Everything a modern farm needs</h2>
          <p>One platform from sowing to selling, designed to be simple enough for everyday use.</p>
        </div>
        <div className="grid-3">
          {FEATURES.map(({ icon: Icon, tone, title, text }) => (
            <div key={title} className="card feature">
              <div className={`stat-icon tone-${tone}`}><Icon size={20} /></div>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>How it works</h2>
        </div>
        <div className="grid-3">
          {STEPS.map((s, i) => (
            <div key={s.title} className="card feature">
              <div className="stat-icon tone-green" style={{ fontWeight: 800 }}>{i + 1}</div>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
          <Link to="/register" className="btn btn-lg">Join AgriConnect <ArrowRight size={18} /></Link>
        </div>
      </section>

      <footer className="footer">
        AgriConnect · Smart Crop Advisory & Farm-to-Market Marketplace · 24CIE554 Full Stack Development
      </footer>
    </div>
  );
}
