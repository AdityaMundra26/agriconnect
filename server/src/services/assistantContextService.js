import { findFarmProfileByUserId } from '../models/farmModel.js';
import { findPlotsByFarmProfileId } from '../models/plotModel.js';
import { findReportsForUser } from '../models/reportModel.js';
import { findListingsByFarmer } from '../models/listingModel.js';
import { findOrdersForFarmer, findOrdersForBuyer } from '../models/orderModel.js';
import { findCropCyclesForOwner } from '../models/cropCycleModel.js';
import { generateAdvisory } from './advisoryService.js';

const MAX_ITEMS = 15;
const inr = (n) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const day = (d) => (d ? new Date(d).toISOString().slice(0, 10) : 'unknown');

function summarizeList(items, formatter, label) {
  if (items.length === 0) return `${label}: none.`;
  const shown = items.slice(0, MAX_ITEMS).map(formatter).join('\n');
  const truncated = items.length > MAX_ITEMS ? `\n(...and ${items.length - MAX_ITEMS} more, not shown)` : '';
  return `${label}:\n${shown}${truncated}`;
}

// Loads everything the assistant may talk about for this user.
export async function loadAssistantData(user) {
  const data = { user, farm: null, plots: [], cycles: [], listings: [], orders: [], reports: [] };

  if (user.role === 'farmer') {
    data.farm = (await findFarmProfileByUserId(user.id)) || null;
    if (data.farm) {
      [data.plots, data.cycles] = await Promise.all([
        findPlotsByFarmProfileId(data.farm.id),
        findCropCyclesForOwner(user.id),
      ]);
    }
    [data.listings, data.orders] = await Promise.all([findListingsByFarmer(user.id), findOrdersForFarmer(user.id)]);
  } else if (user.role === 'buyer') {
    data.orders = await findOrdersForBuyer(user.id);
  }
  data.reports = await findReportsForUser(user.id);
  return data;
}

export function buildContextText(data) {
  const { user, farm } = data;
  const sections = [`User: ${user.name || user.email} (role: ${user.role})`, `Today: ${day(new Date())}`];

  if (user.role === 'farmer') {
    if (farm) {
      sections.push(
        `Farm profile: location=${farm.location}, soil_type=${farm.soil_type || 'unknown'}, ` +
          `irrigation_access=${farm.irrigation_access}, land_size=${farm.land_size ?? 'unknown'} acres, ` +
          `preferred_crops=${(farm.preferred_crops || []).join(', ') || 'none'}`
      );
      sections.push(
        summarizeList(data.plots, (p) => `- ${p.name}: area=${p.area ?? 'unknown'} acres, crop_history="${p.crop_history || 'none'}"`, 'Plots')
      );
      sections.push(
        summarizeList(
          data.cycles,
          (c) =>
            `- ${c.crop_name} on ${c.plot_name}: status=${c.status}, sown=${day(c.sown_date)}, ` +
            `expected_harvest=${day(c.expected_harvest_date)}` +
            (c.harvested_quantity != null ? `, harvested=${c.harvested_quantity} ${c.yield_unit}` : ''),
          'Crop cycles'
        )
      );
      const advisory = generateAdvisory({ farm, plot: { name: 'farm' }, weather: null });
      sections.push(`Current season (rule-based advisory): ${advisory.season}. Suggested crops: ${advisory.suggestedCrops.join(', ')}.`);
    } else {
      sections.push('Farm profile: not created yet.');
    }
    sections.push(
      summarizeList(
        data.listings,
        (l) => `- ${l.crop_name}: ${l.quantity} ${l.unit} @ ${inr(l.unit_price)}/${l.unit}, status=${l.status}, orders=${l.order_count}`,
        'Marketplace listings'
      )
    );
    sections.push(
      summarizeList(
        data.orders,
        (o) => `- Order #${o.id} from ${o.buyer_name}: ${o.crop_name}, qty=${o.quantity} ${o.unit}, total=${inr(o.total_price)}, status=${o.status}, placed=${day(o.created_at)}`,
        'Orders received (as seller)'
      )
    );
  } else if (user.role === 'buyer') {
    sections.push(
      summarizeList(
        data.orders,
        (o) => `- Order #${o.id} from ${o.farmer_name}: ${o.crop_name}, qty=${o.quantity} ${o.unit}, total=${inr(o.total_price)}, status=${o.status}, placed=${day(o.created_at)}`,
        'Orders placed (as buyer)'
      )
    );
  }

  sections.push(
    summarizeList(
      data.reports,
      (r) =>
        `- Report #${r.id} (${day(r.created_at)}): "${r.description}" ` +
        `[category=${r.category}, severity=${r.severity}, status=${r.status}, location=${r.location || 'unspecified'}]`,
      'Field reports submitted'
    )
  );

  return sections.join('\n\n');
}

// ---------------------------------------------------------------------------
// Offline answers (no API key): keyword intent matching over the same data,
// so the assistant still gives a useful, grounded reply in a demo.
// ---------------------------------------------------------------------------

function countBy(items, key) {
  return items.reduce((acc, item) => ({ ...acc, [item[key]]: (acc[item[key]] || 0) + 1 }), {});
}
const fmtCounts = (counts) => Object.entries(counts).map(([k, v]) => `${v} ${k.replace('_', ' ')}`).join(', ');

export function offlineAnswer(question, data) {
  const q = question.toLowerCase();
  const { user, farm, plots, cycles, listings, orders, reports } = data;
  const lines = [];

  const wantsReports = /(report|issue|problem|pest|disease|irrigation|complain)/.test(q);
  const wantsOrders = /(order|sale|sold|sell|revenue|earn|income|purchase|bought|buy|spend|spent)/.test(q);
  const wantsListings = /(listing|stock|produce|market|price)/.test(q);
  const wantsFarm = /(farm|plot|soil|land|acre|field)/.test(q);
  const wantsCrops = /(crop|sow|plant|harvest|yield|season|grow|recommend|suggest|what should)/.test(q);
  const anyIntent = wantsReports || wantsOrders || wantsListings || wantsFarm || wantsCrops;

  if (wantsReports || !anyIntent) {
    if (reports.length === 0) lines.push('You have not submitted any field reports.');
    else {
      const open = reports.filter((r) => r.status === 'open' || r.status === 'in_progress');
      lines.push(`**Field reports:** ${reports.length} total (${fmtCounts(countBy(reports, 'status'))}).`);
      open.slice(0, 3).forEach((r) => lines.push(`- #${r.id} ${r.category} (${r.severity}): "${r.description.slice(0, 80)}" is ${r.status.replace('_', ' ')}`));
    }
  }

  if (wantsOrders || !anyIntent) {
    if (orders.length === 0) lines.push(user.role === 'buyer' ? 'You have not placed any orders yet.' : 'No orders yet.');
    else {
      const live = orders.filter((o) => o.status !== 'cancelled');
      const total = live.reduce((s, o) => s + Number(o.total_price), 0);
      const verb = user.role === 'buyer' ? 'spent' : 'earned';
      lines.push(`**Orders:** ${orders.length} total (${fmtCounts(countBy(orders, 'status'))}). You have ${verb} ${inr(total)} across non-cancelled orders.`);
      const pending = orders.filter((o) => o.status === 'pending');
      if (pending.length && user.role === 'farmer') lines.push(`- ${pending.length} order(s) are waiting for you to confirm.`);
    }
  }

  if (user.role === 'farmer' && (wantsListings || !anyIntent)) {
    if (listings.length === 0) lines.push('You have no marketplace listings.');
    else {
      const active = listings.filter((l) => l.status === 'active');
      lines.push(`**Listings:** ${active.length} active of ${listings.length}.`);
      active.slice(0, 4).forEach((l) => lines.push(`- ${l.crop_name}: ${Number(l.quantity)} ${l.unit} left at ${inr(l.unit_price)}/${l.unit}`));
    }
  }

  if (user.role === 'farmer' && wantsFarm) {
    if (!farm) lines.push('You have not created a farm profile yet. Head to My Farm to set it up.');
    else {
      lines.push(`**Farm:** ${farm.location}, ${farm.soil_type || 'unknown soil'}, ${farm.irrigation_access} irrigation, ${farm.land_size ?? '?'} acres.`);
      lines.push(`- ${plots.length} plot(s): ${plots.map((p) => p.name).join(', ') || 'none'}`);
    }
  }

  if (user.role === 'farmer' && wantsCrops) {
    if (!farm) lines.push('Create a farm profile to get crop recommendations.');
    else {
      const advisory = generateAdvisory({ farm, plot: { name: 'farm' }, weather: null });
      lines.push(`**Season:** it's ${advisory.season} season. Suitable crops for you: ${advisory.suggestedCrops.join(', ')}.`);
      const growing = cycles.filter((c) => ['sown', 'growing'].includes(c.status));
      if (growing.length) lines.push(`- Currently growing: ${growing.map((c) => `${c.crop_name} on ${c.plot_name}`).join(', ')}`);
      const harvested = cycles.filter((c) => c.status === 'harvested' && c.harvested_quantity != null);
      if (harvested.length) lines.push(`- Recorded harvests: ${harvested.map((c) => `${c.crop_name} ${Number(c.harvested_quantity)} ${c.yield_unit}`).join(', ')}`);
    }
  }

  if (lines.length === 0) {
    lines.push("I couldn't find anything in your account related to that. Try asking about your orders, listings, reports, farm or crops.");
  }
  return lines.join('\n');
}
