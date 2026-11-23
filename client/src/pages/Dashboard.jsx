import { Link } from 'react-router-dom';
import {
  Sprout,
  Store,
  ShoppingBag,
  IndianRupee,
  ClipboardList,
  Users,
  AlertTriangle,
  Package,
  Truck,
  CalendarClock,
  Plus,
  ArrowRight,
  Bot,
  MapPin,
  Leaf,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { getDashboardSummary } from '../api/dashboard.js';
import { useLoader } from '../hooks/useLoader.js';
import { StatCard, StatusBadge, EmptyState, PageLoading, FormError, Avatar, Badge } from '../components/ui.jsx';
import { inr, inrCompact, num, timeAgo, shortDate, daysUntil, label } from '../utils/format.js';
import { cropEmoji, cropTint } from '../utils/constants.js';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function SectionCard({ title, icon: Icon, to, linkText = 'View all', children }) {
  return (
    <div className="card">
      <div className="card-header">
        <h3>
          {Icon && <Icon size={18} color="var(--text-3)" />} {title}
        </h3>
        {to && (
          <Link to={to} className="btn btn-ghost btn-sm">
            {linkText} <ArrowRight size={15} />
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

function OrderList({ orders, counterpartKey, counterpartLabel }) {
  if (orders.length === 0) {
    return <EmptyState icon={ShoppingBag} title="No orders yet" />;
  }
  return (
    <div className="list">
      {orders.map((o) => (
        <div key={o.id} className="list-item">
          <div className={`stat-icon ${cropTint(o.crop_name)}`} style={{ width: 38, height: 38, fontSize: '1.2rem' }}>
            {cropEmoji(o.crop_name)}
          </div>
          <div className="grow">
            <div className="title">
              {o.crop_name} · {num(o.quantity)} {o.unit}
            </div>
            <div className="meta">
              #{o.id} · {counterpartLabel} {o[counterpartKey]} · {timeAgo(o.created_at)}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="num" style={{ fontWeight: 650 }}>{inr(o.total_price)}</div>
            <StatusBadge kind="order" value={o.status} />
          </div>
        </div>
      ))}
    </div>
  );
}

function FarmerDashboard({ data }) {
  const { stats, recentOrders, upcomingHarvests, recentReports } = data;
  return (
    <>
      {!stats.has_farm && (
        <div className="card card-pad row wrap" style={{ marginBottom: '1.5rem', background: 'var(--brand-50)', borderColor: 'var(--brand-200)' }}>
          <div className="stat-icon tone-green"><Sprout size={20} /></div>
          <div className="grow">
            <h3>Set up your farm profile</h3>
            <p className="muted">Add your location, soil and irrigation to unlock crop advisory and plot tracking.</p>
          </div>
          <Link to="/farm" className="btn">Set up farm <ArrowRight size={16} /></Link>
        </div>
      )}

      <div className="stats">
        <StatCard icon={IndianRupee} label="Total sales" value={inrCompact(stats.revenue)} sub="excluding cancelled orders" tone="green" />
        <StatCard icon={Package} label="Pending orders" value={stats.pending_orders} sub="awaiting your confirmation" tone="amber" />
        <StatCard icon={Store} label="Active listings" value={stats.active_listings} sub="live on the marketplace" tone="blue" />
        <StatCard icon={Leaf} label="Growing crops" value={stats.active_cycles} sub={`${stats.plots} plots · ${num(stats.plot_area)} acres`} tone="violet" />
      </div>

      <div className="grid-main-side">
        <div className="stack-lg">
          <SectionCard title="Recent orders" icon={ShoppingBag} to="/orders">
            <OrderList orders={recentOrders} counterpartKey="buyer_name" counterpartLabel="from" />
          </SectionCard>
          <SectionCard title="Field reports" icon={ClipboardList} to="/reports">
            {recentReports.length === 0 ? (
              <EmptyState icon={ClipboardList} title="No reports filed">Report pests, disease or equipment issues and track them here.</EmptyState>
            ) : (
              <div className="list">
                {recentReports.map((r) => (
                  <div key={r.id} className="list-item">
                    <div className="grow">
                      <div className="title" style={{ fontWeight: 520 }}>{r.description}</div>
                      <div className="meta"><span style={{ textTransform: 'capitalize' }}>{label(r.category)}</span> · {timeAgo(r.created_at)}</div>
                    </div>
                    <StatusBadge kind="severity" value={r.severity} dot={false} />
                    <StatusBadge kind="report" value={r.status} />
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        <div className="stack-lg">
          <SectionCard title="Crop calendar" icon={CalendarClock} to="/farm" linkText="Manage">
            {upcomingHarvests.length === 0 ? (
              <EmptyState icon={Sprout} title="No active crops">Add a crop cycle to a plot to track sowing and harvest.</EmptyState>
            ) : (
              <div className="list">
                {upcomingHarvests.map((c) => {
                  const d = daysUntil(c.expected_harvest_date);
                  return (
                    <div key={c.id} className="list-item">
                      <span style={{ fontSize: '1.4rem' }}>{cropEmoji(c.crop_name)}</span>
                      <div className="grow">
                        <div className="title">{c.crop_name}</div>
                        <div className="meta">{c.plot_name}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <StatusBadge kind="cycle" value={c.status} />
                        {d !== null && (
                          <div className="subtle" style={{ marginTop: 3 }}>
                            {d > 0 ? `harvest in ${d}d` : d === 0 ? 'harvest today' : `${-d}d overdue`}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>

          <div className="card card-pad stack">
            <h3>Quick actions</h3>
            <Link to="/marketplace?new=1" className="btn btn-secondary btn-block" style={{ justifyContent: 'flex-start' }}><Plus size={17} /> List produce for sale</Link>
            <Link to="/reports" className="btn btn-secondary btn-block" style={{ justifyContent: 'flex-start' }}><AlertTriangle size={17} /> Report a field issue</Link>
            <Link to="/assistant" className="btn btn-secondary btn-block" style={{ justifyContent: 'flex-start' }}><Bot size={17} /> Ask the AI assistant</Link>
          </div>
        </div>
      </div>
    </>
  );
}

function BuyerDashboard({ data }) {
  const { stats, recentOrders, freshListings } = data;
  return (
    <>
      <div className="stats">
        <StatCard icon={IndianRupee} label="Total spent" value={inrCompact(stats.spent)} sub={`${stats.orders} orders placed`} tone="green" />
        <StatCard icon={Truck} label="In progress" value={stats.in_progress} sub="pending, confirmed or shipped" tone="amber" />
        <StatCard icon={Package} label="Delivered" value={stats.delivered} tone="blue" />
        <StatCard icon={Store} label="Available listings" value={stats.available_listings} sub={`from ${stats.active_sellers} farmers`} tone="violet" />
      </div>
      <div className="grid-main-side">
        <SectionCard title="Your recent orders" icon={ShoppingBag} to="/orders">
          <OrderList orders={recentOrders} counterpartKey="farmer_name" counterpartLabel="by" />
        </SectionCard>
        <SectionCard title="Fresh on the market" icon={Store} to="/marketplace" linkText="Browse">
          {freshListings.length === 0 ? (
            <EmptyState icon={Store} title="No listings right now" />
          ) : (
            <div className="list">
              {freshListings.map((l) => (
                <Link key={l.id} to="/marketplace" className="list-item clickable" style={{ color: 'inherit', textDecoration: 'none' }}>
                  <div className={`stat-icon ${cropTint(l.crop_name)}`} style={{ width: 38, height: 38, fontSize: '1.2rem' }}>{cropEmoji(l.crop_name)}</div>
                  <div className="grow">
                    <div className="title">{l.crop_name}</div>
                    <div className="meta row" style={{ gap: 4 }}><MapPin size={12} /> {l.seller_location || l.farmer_name}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 650 }}>{inr(l.unit_price)}<span className="subtle">/{l.unit}</span></div>
                    <div className="subtle">{num(l.quantity)} {l.unit}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </>
  );
}

function AdminDashboard({ data }) {
  const { stats, usersByRole, recentReports, recentUsers } = data;
  return (
    <>
      <div className="stats">
        <StatCard icon={Users} label="Users" value={stats.users} sub={usersByRole.map((r) => `${r.count} ${r.role}s`).join(' · ')} tone="blue" />
        <StatCard icon={IndianRupee} label="Marketplace GMV" value={inrCompact(stats.gmv)} sub={`${stats.orders} orders`} tone="green" />
        <StatCard icon={Store} label="Active listings" value={stats.active_listings} tone="violet" />
        <StatCard icon={AlertTriangle} label="Open reports" value={stats.open_reports} sub={`${stats.urgent_reports} high or critical`} tone="red" />
      </div>
      <div className="grid-main-side">
        <SectionCard title="Reports needing attention" icon={AlertTriangle} to="/reports" linkText="Moderate">
          {recentReports.length === 0 ? (
            <EmptyState icon={ClipboardList} title="All clear">No open field reports.</EmptyState>
          ) : (
            <div className="list">
              {recentReports.map((r) => (
                <div key={r.id} className="list-item">
                  <StatusBadge kind="severity" value={r.severity} dot={false} />
                  <div className="grow">
                    <div className="title" style={{ fontWeight: 520 }}>{r.description}</div>
                    <div className="meta">{r.reporter_name} · <span style={{ textTransform: 'capitalize' }}>{label(r.category)}</span> · {timeAgo(r.created_at)}</div>
                  </div>
                  <StatusBadge kind="report" value={r.status} />
                </div>
              ))}
            </div>
          )}
        </SectionCard>
        <SectionCard title="Newest users" icon={Users} to="/admin" linkText="All users">
          <div className="list">
            {recentUsers.map((u) => (
              <div key={u.id} className="list-item">
                <Avatar name={u.name} size="sm" />
                <div className="grow">
                  <div className="title">{u.name}</div>
                  <div className="meta">joined {shortDate(u.created_at)}</div>
                </div>
                <Badge tone={{ farmer: 'green', buyer: 'blue', admin: 'violet' }[u.role]}>{u.role}</Badge>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data, loading, error } = useLoader(getDashboardSummary);

  const subtitle = {
    farmer: "Here's what's happening on your farm today.",
    buyer: 'Track your orders and discover fresh produce.',
    admin: 'Platform overview and items needing moderation.',
  }[user.role];

  return (
    <>
      <div className="page-header">
        <div>
          <h1>{greeting()}, {user.name.split(' ')[0]} 👋</h1>
          <p>{subtitle}</p>
        </div>
        {user.role === 'buyer' && <Link to="/marketplace" className="btn"><Store size={17} /> Browse produce</Link>}
        {user.role === 'farmer' && <Link to="/marketplace?new=1" className="btn"><Plus size={17} /> New listing</Link>}
      </div>
      {loading && !data ? (
        <PageLoading />
      ) : error ? (
        <FormError>{error}</FormError>
      ) : data.role === 'farmer' ? (
        <FarmerDashboard data={data} />
      ) : data.role === 'buyer' ? (
        <BuyerDashboard data={data} />
      ) : (
        <AdminDashboard data={data} />
      )}
    </>
  );
}
