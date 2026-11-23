import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { IndianRupee, ShoppingBag, PackageCheck, Receipt, Wheat, ClipboardList, Sprout, AlertTriangle } from 'lucide-react';
import { getReportsAnalytics, getMarketplaceAnalytics, getYieldAnalytics } from '../api/analytics.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useLoader } from '../hooks/useLoader.js';
import { PageHeader, StatCard, PageLoading, FormError } from '../components/ui.jsx';
import { useChartTheme, SEVERITY_COLORS, REPORT_STATUS_COLORS } from '../charts/theme.js';
import { inr, inrCompact, num, shortDate, label } from '../utils/format.js';

async function loadAll(role) {
  const [marketplace, reports, yieldData] = await Promise.all([
    getMarketplaceAnalytics(),
    role === 'buyer' ? null : getReportsAnalytics(),
    role === 'buyer' ? null : getYieldAnalytics(),
  ]);
  return { marketplace, reports, yieldData };
}

const monthLabel = (m) => new Date(`${m}-01`).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });

function ChartCard({ title, subtitle, empty, height = 240, children }) {
  return (
    <div className="card chart-card">
      <h3>{title}</h3>
      <span className="subtle">{subtitle || ' '}</span>
      {empty ? (
        <div className="empty" style={{ height, padding: 0, justifyContent: 'center' }}>
          <p className="subtle">No data yet</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          {children}
        </ResponsiveContainer>
      )}
    </div>
  );
}

function useAxes() {
  const t = useChartTheme();
  const tick = { fill: t.axis, fontSize: 12 };
  return {
    t,
    grid: <CartesianGrid stroke={t.grid} vertical={false} />,
    gridV: <CartesianGrid stroke={t.grid} horizontal={false} />,
    tick,
    axisLine: { stroke: t.baseline },
    cursor: { fill: t.grid, opacity: 0.5 },
  };
}

function TooltipBox({ active, payload, label: l, labelFormatter, valueFormatter, name }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card" style={{ padding: '0.55rem 0.75rem', boxShadow: 'var(--shadow)', fontSize: '0.83rem' }}>
      <div style={{ fontWeight: 600, marginBottom: 2, textTransform: 'capitalize' }}>{labelFormatter ? labelFormatter(l) : label(l)}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="row" style={{ gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: p.payload?.fill || p.color || p.stroke }} />
          <span className="muted">{name || p.name}:</span>
          <strong className="num">{valueFormatter ? valueFormatter(p.value) : num(p.value)}</strong>
        </div>
      ))}
    </div>
  );
}

function MarketplaceSection({ data, role }) {
  const { t, grid, gridV, tick, axisLine, cursor } = useAxes();
  const { totals, orderVolume, topCrops, ordersByStatus } = data;
  const moneyLabel = role === 'buyer' ? 'Spent' : role === 'farmer' ? 'Revenue' : 'GMV';

  return (
    <section className="stack">
      <h2>Marketplace</h2>
      <div className="stats" style={{ marginBottom: 0 }}>
        <StatCard icon={IndianRupee} label={moneyLabel} value={inrCompact(totals.revenue)} sub="excluding cancelled" tone="green" />
        <StatCard icon={ShoppingBag} label="Orders" value={totals.orders} tone="blue" />
        <StatCard icon={PackageCheck} label="Delivered" value={totals.delivered} sub={totals.orders ? `${Math.round((totals.delivered / totals.orders) * 100)}% of orders` : undefined} tone="violet" />
        <StatCard icon={Receipt} label="Avg. order value" value={inr(Math.round(totals.avg_order_value))} tone="amber" />
      </div>
      <div className="grid-2">
        <ChartCard title={`${moneyLabel} over time`} subtitle="Daily, ₹, excluding cancelled orders" empty={orderVolume.length === 0}>
          <AreaChart data={orderVolume} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="rev" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor={t.seq2} stopOpacity={0.3} />
                <stop offset="1" stopColor={t.seq2} stopOpacity={0} />
              </linearGradient>
            </defs>
            {grid}
            <XAxis dataKey="date" tickFormatter={shortDate} tick={tick} axisLine={axisLine} tickLine={false} minTickGap={24} />
            <YAxis tickFormatter={inrCompact} tick={tick} axisLine={false} tickLine={false} width={56} />
            <Tooltip content={<TooltipBox labelFormatter={shortDate} valueFormatter={inr} name={moneyLabel} />} cursor={{ stroke: t.baseline }} />
            <Area type="monotone" dataKey="revenue" stroke={t.seq2} strokeWidth={2} fill="url(#rev)" dot={{ r: 4, fill: t.seq2, stroke: t.surface, strokeWidth: 2 }} activeDot={{ r: 6 }} />
          </AreaChart>
        </ChartCard>

        <ChartCard title="Orders over time" subtitle="Number of orders per day" empty={orderVolume.length === 0}>
          <BarChart data={orderVolume} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            {grid}
            <XAxis dataKey="date" tickFormatter={shortDate} tick={tick} axisLine={axisLine} tickLine={false} minTickGap={24} />
            <YAxis allowDecimals={false} tick={tick} axisLine={false} tickLine={false} width={32} />
            <Tooltip content={<TooltipBox labelFormatter={shortDate} name="Orders" />} cursor={cursor} />
            <Bar dataKey="count" fill={t.seq} radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ChartCard>

        <ChartCard title="Top crops" subtitle={`${moneyLabel} by crop, ₹`} empty={topCrops.length === 0}>
          <BarChart data={topCrops} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 0 }}>
            {gridV}
            <XAxis type="number" tickFormatter={inrCompact} tick={tick} axisLine={axisLine} tickLine={false} />
            <YAxis dataKey="crop_name" type="category" width={84} tick={tick} axisLine={false} tickLine={false} />
            <Tooltip content={<TooltipBox valueFormatter={inr} name={moneyLabel} />} cursor={cursor} />
            <Bar dataKey="total_revenue" fill={t.seq} radius={[0, 4, 4, 0]} maxBarSize={22} />
          </BarChart>
        </ChartCard>

        <ChartCard title="Orders by status" subtitle="Where every order currently is" empty={ordersByStatus.length === 0}>
          <BarChart data={ordersByStatus} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            {grid}
            <XAxis dataKey="status" tick={tick} axisLine={axisLine} tickLine={false} />
            <YAxis allowDecimals={false} tick={tick} axisLine={false} tickLine={false} width={32} />
            <Tooltip content={<TooltipBox name="Orders" />} cursor={cursor} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={44}>
              {ordersByStatus.map((e) => <Cell key={e.status} fill={t.orderStatus[e.status] || t.seq} />)}
            </Bar>
          </BarChart>
        </ChartCard>
      </div>
    </section>
  );
}

function YieldSection({ data }) {
  const { t, grid, tick, axisLine, cursor } = useAxes();
  const { byCrop: allCrops, overTime, cycleStatus } = data;
  // One axis = one unit: chart kg crops only and name the rest in the subtitle.
  const byCrop = allCrops.filter((c) => c.unit === 'kg');
  const otherUnits = allCrops.filter((c) => c.unit !== 'kg');
  const otherNote = otherUnits.length
    ? ` · not shown: ${otherUnits.map((c) => `${c.crop_name} ${num(Math.round(c.total_quantity))} ${c.unit}`).join(', ')}`
    : '';
  const total = byCrop.reduce((s, c) => s + c.total_quantity, 0);
  const count = (s) => cycleStatus.find((c) => c.status === s)?.count || 0;

  return (
    <section className="stack">
      <h2>Harvest & yield</h2>
      <div className="stats" style={{ marginBottom: 0 }}>
        <StatCard icon={Wheat} label="Harvested (kg crops)" value={`${num(Math.round(total))} kg`} tone="amber" />
        <StatCard icon={Sprout} label="Growing now" value={count('sown') + count('growing')} sub={`${count('planned')} planned`} tone="green" />
        <StatCard icon={PackageCheck} label="Harvests recorded" value={count('harvested')} sub={count('failed') ? `${count('failed')} failed` : undefined} tone="blue" />
      </div>
      <div className="grid-2">
        <ChartCard title="Yield by crop" subtitle={`Total harvested, kg${otherNote}`} empty={byCrop.length === 0}>
          <BarChart data={byCrop.map((c) => ({ ...c, name: c.crop_name }))} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            {grid}
            <XAxis dataKey="name" tick={tick} axisLine={axisLine} tickLine={false} interval={0} />
            <YAxis tick={tick} axisLine={false} tickLine={false} width={48} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} />
            <Tooltip content={<TooltipBox name="Harvested" />} cursor={cursor} />
            <Bar dataKey="total_quantity" fill={t.green} radius={[4, 4, 0, 0]} maxBarSize={44} />
          </BarChart>
        </ChartCard>
        <ChartCard title="Yield per acre" subtitle="Harvested kg ÷ plot area (acres)" empty={byCrop.filter((c) => c.per_acre).length === 0}>
          <BarChart data={byCrop.filter((c) => c.per_acre).map((c) => ({ ...c, name: c.crop_name }))} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            {grid}
            <XAxis dataKey="name" tick={tick} axisLine={axisLine} tickLine={false} interval={0} />
            <YAxis tick={tick} axisLine={false} tickLine={false} width={48} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} />
            <Tooltip content={<TooltipBox name="Per acre" valueFormatter={(v) => num(Math.round(v))} />} cursor={cursor} />
            <Bar dataKey="per_acre" fill={t.seq} radius={[4, 4, 0, 0]} maxBarSize={44} />
          </BarChart>
        </ChartCard>
        {overTime.length > 1 && (
          <ChartCard title="Harvest over time" subtitle="Monthly harvested quantity, kg crops" empty={false}>
            <LineChart data={overTime} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              {grid}
              <XAxis dataKey="month" tickFormatter={monthLabel} tick={tick} axisLine={axisLine} tickLine={false} />
              <YAxis tick={tick} axisLine={false} tickLine={false} width={48} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} />
              <Tooltip content={<TooltipBox labelFormatter={monthLabel} name="Harvested" />} cursor={{ stroke: t.baseline }} />
              <Line type="monotone" dataKey="total_quantity" stroke={t.green} strokeWidth={2} dot={{ r: 4, fill: t.green, stroke: t.surface, strokeWidth: 2 }} />
            </LineChart>
          </ChartCard>
        )}
      </div>
    </section>
  );
}

function ReportsSection({ data, isAdmin }) {
  const { t, grid, gridV, tick, axisLine, cursor } = useAxes();
  const { byCategory, bySeverity, byStatus, overTime } = data;
  const total = byStatus.reduce((s, r) => s + r.count, 0);
  const open = byStatus.filter((r) => ['open', 'in_progress'].includes(r.status)).reduce((s, r) => s + r.count, 0);
  const urgent = bySeverity.filter((r) => ['high', 'critical'].includes(r.severity)).reduce((s, r) => s + r.count, 0);

  return (
    <section className="stack">
      <h2>Field reports</h2>
      <div className="stats" style={{ marginBottom: 0 }}>
        <StatCard icon={ClipboardList} label={isAdmin ? 'All reports' : 'Reports filed'} value={total} tone="blue" />
        <StatCard icon={AlertTriangle} label="Open" value={open} sub="open or in progress" tone="red" />
        <StatCard icon={AlertTriangle} label="High / critical" value={urgent} tone="amber" />
      </div>
      <div className="grid-2">
        <ChartCard title="By category" empty={byCategory.length === 0}>
          <BarChart data={byCategory} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 0 }}>
            {gridV}
            <XAxis type="number" allowDecimals={false} tick={tick} axisLine={axisLine} tickLine={false} />
            <YAxis dataKey="category" type="category" width={110} tick={tick} axisLine={false} tickLine={false} tickFormatter={label} />
            <Tooltip content={<TooltipBox name="Reports" />} cursor={cursor} />
            <Bar dataKey="count" fill={t.seq} radius={[0, 4, 4, 0]} maxBarSize={22} />
          </BarChart>
        </ChartCard>
        <ChartCard title="By severity" empty={bySeverity.length === 0}>
          <BarChart data={bySeverity} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            {grid}
            <XAxis dataKey="severity" tick={tick} axisLine={axisLine} tickLine={false} />
            <YAxis allowDecimals={false} tick={tick} axisLine={false} tickLine={false} width={32} />
            <Tooltip content={<TooltipBox name="Reports" />} cursor={cursor} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={44}>
              {bySeverity.map((e) => <Cell key={e.severity} fill={SEVERITY_COLORS[e.severity]} />)}
            </Bar>
          </BarChart>
        </ChartCard>
        <ChartCard title="By status" empty={byStatus.length === 0}>
          <BarChart data={byStatus} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            {grid}
            <XAxis dataKey="status" tick={tick} axisLine={axisLine} tickLine={false} tickFormatter={label} />
            <YAxis allowDecimals={false} tick={tick} axisLine={false} tickLine={false} width={32} />
            <Tooltip content={<TooltipBox name="Reports" />} cursor={cursor} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={44}>
              {byStatus.map((e) => <Cell key={e.status} fill={REPORT_STATUS_COLORS[e.status]} />)}
            </Bar>
          </BarChart>
        </ChartCard>
        <ChartCard title="Reports over time" subtitle="Filed per day" empty={overTime.length === 0}>
          <BarChart data={overTime} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            {grid}
            <XAxis dataKey="date" tickFormatter={shortDate} tick={tick} axisLine={axisLine} tickLine={false} minTickGap={24} />
            <YAxis allowDecimals={false} tick={tick} axisLine={false} tickLine={false} width={32} />
            <Tooltip content={<TooltipBox labelFormatter={shortDate} name="Reports" />} cursor={cursor} />
            <Bar dataKey="count" fill={t.seq} radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ChartCard>
      </div>
    </section>
  );
}

export default function Analytics() {
  const { user } = useAuth();
  const { data, loading, error } = useLoader(() => loadAll(user.role), [user.role]);

  const description = {
    farmer: 'Your sales, harvests and field issues at a glance.',
    buyer: 'Your purchasing activity on the marketplace.',
    admin: 'Platform-wide marketplace, yield and report metrics.',
  }[user.role];

  return (
    <>
      <PageHeader title="Analytics" description={description} />
      {loading && !data ? (
        <PageLoading />
      ) : error ? (
        <FormError>{error}</FormError>
      ) : (
        <div className="stack-lg" style={{ gap: '2.25rem' }}>
          <MarketplaceSection data={data.marketplace} role={user.role} />
          {data.yieldData && <YieldSection data={data.yieldData} />}
          {data.reports && <ReportsSection data={data.reports} isAdmin={user.role === 'admin'} />}
        </div>
      )}
    </>
  );
}
