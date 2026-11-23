import { CheckCircle2 } from 'lucide-react';
import { BrandLogo } from '../components/AppLayout.jsx';

const POINTS = [
  'Season- and soil-aware crop advisory for every plot',
  'Sell produce directly to verified buyers',
  'Report field issues; they are auto-classified and tracked',
  'Analytics and an AI assistant grounded in your own data',
];

export default function AuthAside() {
  return (
    <aside className="auth-aside">
      <BrandLogo />
      <div>
        <h2>From the field to the market, all in one place.</h2>
        <ul>
          {POINTS.map((p) => (
            <li key={p}>
              <CheckCircle2 size={18} /> {p}
            </li>
          ))}
        </ul>
      </div>
      <p style={{ opacity: 0.7, fontSize: '0.85rem' }}>Smart Crop Advisory & Farm-to-Market Platform</p>
    </aside>
  );
}
