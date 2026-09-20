import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { getReportsAnalytics, getMarketplaceAnalytics } from '../api/analytics.js';
import {
  SEQUENTIAL_BLUE,
  SEQUENTIAL_ORANGE,
  SEVERITY_COLORS,
  REPORT_STATUS_COLORS,
  ORDER_STATUS_COLORS,
  CHART_CHROME,
} from '../charts/theme.js';

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function ChartCard({ title, empty, children }) {
  return (
    <div className="card chart-card">
      <h3>{title}</h3>
      {empty ? <p className="hint">No data yet.</p> : <ResponsiveContainer width="100%" height={240}>{children}</ResponsiveContainer>}
    </div>
  );
}

export default function Analytics() {
  const [reports, setReports] = useState(null);
  const [marketplace, setMarketplace] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getReportsAnalytics(), getMarketplaceAnalytics()])
      .then(([reportsData, marketplaceData]) => {
        setReports(reportsData);
        setMarketplace(marketplaceData);
      })
      .catch((err) => setError(err.response?.data?.error || 'Failed to load analytics'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page"><p>Loading...</p></div>;

  return (
    <div className="page page-wide">
      <h1>Analytics</h1>
      {error && <p className="error">{error}</p>}

      {reports && (
        <>
          <h2>Field Reports</h2>
          <div className="chart-grid">
            <ChartCard title="Reports by category" empty={reports.byCategory.length === 0}>
              <BarChart data={reports.byCategory}>
                <CartesianGrid stroke={CHART_CHROME.grid} vertical={false} />
                <XAxis dataKey="category" tick={{ fill: CHART_CHROME.axis, fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fill: CHART_CHROME.axis, fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill={SEQUENTIAL_BLUE} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartCard>

            <ChartCard title="Reports by severity" empty={reports.bySeverity.length === 0}>
              <BarChart data={reports.bySeverity}>
                <CartesianGrid stroke={CHART_CHROME.grid} vertical={false} />
                <XAxis dataKey="severity" tick={{ fill: CHART_CHROME.axis, fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fill: CHART_CHROME.axis, fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {reports.bySeverity.map((entry) => (
                    <Cell key={entry.severity} fill={SEVERITY_COLORS[entry.severity] || SEQUENTIAL_BLUE} />
                  ))}
                </Bar>
              </BarChart>
            </ChartCard>

            <ChartCard title="Reports by status" empty={reports.byStatus.length === 0}>
              <BarChart data={reports.byStatus}>
                <CartesianGrid stroke={CHART_CHROME.grid} vertical={false} />
                <XAxis dataKey="status" tick={{ fill: CHART_CHROME.axis, fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fill: CHART_CHROME.axis, fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {reports.byStatus.map((entry) => (
                    <Cell key={entry.status} fill={REPORT_STATUS_COLORS[entry.status] || SEQUENTIAL_BLUE} />
                  ))}
                </Bar>
              </BarChart>
            </ChartCard>

            <ChartCard title="Reports over time" empty={reports.overTime.length === 0}>
              <LineChart data={reports.overTime}>
                <CartesianGrid stroke={CHART_CHROME.grid} vertical={false} />
                <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fill: CHART_CHROME.axis, fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fill: CHART_CHROME.axis, fontSize: 12 }} />
                <Tooltip labelFormatter={formatDate} />
                <Line type="monotone" dataKey="count" stroke={SEQUENTIAL_BLUE} strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ChartCard>
          </div>
        </>
      )}

      {marketplace && (
        <>
          <h2>Marketplace</h2>
          <div className="chart-grid">
            <ChartCard title="Orders over time" empty={marketplace.orderVolume.length === 0}>
              <LineChart data={marketplace.orderVolume}>
                <CartesianGrid stroke={CHART_CHROME.grid} vertical={false} />
                <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fill: CHART_CHROME.axis, fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fill: CHART_CHROME.axis, fontSize: 12 }} />
                <Tooltip labelFormatter={formatDate} />
                <Line type="monotone" dataKey="count" name="orders" stroke={SEQUENTIAL_BLUE} strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ChartCard>

            <ChartCard title="Revenue over time (₹)" empty={marketplace.orderVolume.length === 0}>
              <LineChart data={marketplace.orderVolume}>
                <CartesianGrid stroke={CHART_CHROME.grid} vertical={false} />
                <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fill: CHART_CHROME.axis, fontSize: 12 }} />
                <YAxis tick={{ fill: CHART_CHROME.axis, fontSize: 12 }} />
                <Tooltip labelFormatter={formatDate} />
                <Line type="monotone" dataKey="revenue" name="revenue" stroke={SEQUENTIAL_ORANGE} strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ChartCard>

            <ChartCard title="Top crops by revenue (₹)" empty={marketplace.topCrops.length === 0}>
              <BarChart data={marketplace.topCrops} layout="vertical" margin={{ left: 16 }}>
                <CartesianGrid stroke={CHART_CHROME.grid} horizontal={false} />
                <XAxis type="number" tick={{ fill: CHART_CHROME.axis, fontSize: 12 }} />
                <YAxis dataKey="crop_name" type="category" width={90} tick={{ fill: CHART_CHROME.axis, fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="total_revenue" name="revenue" fill={SEQUENTIAL_BLUE} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartCard>

            <ChartCard title="Orders by status" empty={marketplace.ordersByStatus.length === 0}>
              <BarChart data={marketplace.ordersByStatus}>
                <CartesianGrid stroke={CHART_CHROME.grid} vertical={false} />
                <XAxis dataKey="status" tick={{ fill: CHART_CHROME.axis, fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fill: CHART_CHROME.axis, fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {marketplace.ordersByStatus.map((entry) => (
                    <Cell key={entry.status} fill={ORDER_STATUS_COLORS[entry.status] || SEQUENTIAL_BLUE} />
                  ))}
                </Bar>
              </BarChart>
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
}
