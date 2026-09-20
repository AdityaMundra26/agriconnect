import { findFarmProfileByUserId } from '../models/farmModel.js';
import { findPlotsByFarmProfileId } from '../models/plotModel.js';
import { findReportsForUser } from '../models/reportModel.js';
import { findListingsByFarmer } from '../models/listingModel.js';
import { findOrdersForFarmer, findOrdersForBuyer } from '../models/orderModel.js';

const MAX_ITEMS = 15;

function summarizeList(items, formatter, label) {
  if (items.length === 0) return `${label}: none.`;
  const shown = items.slice(0, MAX_ITEMS).map(formatter).join('\n');
  const truncated = items.length > MAX_ITEMS ? `\n(...and ${items.length - MAX_ITEMS} more, not shown)` : '';
  return `${label}:\n${shown}${truncated}`;
}

export async function buildAssistantContext(user) {
  const sections = [`User: ${user.email} (role: ${user.role})`];

  if (user.role === 'farmer') {
    const farm = await findFarmProfileByUserId(user.id);
    if (farm) {
      sections.push(
        `Farm profile: location=${farm.location}, soil_type=${farm.soil_type || 'unknown'}, ` +
          `irrigation_access=${farm.irrigation_access}, land_size=${farm.land_size ?? 'unknown'} acres, ` +
          `preferred_crops=${(farm.preferred_crops || []).join(', ') || 'none'}`
      );

      const plots = await findPlotsByFarmProfileId(farm.id);
      sections.push(
        summarizeList(
          plots,
          (p) => `- ${p.name}: area=${p.area ?? 'unknown'} acres, crop_history="${p.crop_history || 'none'}"`,
          'Plots'
        )
      );
    } else {
      sections.push('Farm profile: not created yet.');
    }

    const listings = await findListingsByFarmer(user.id);
    sections.push(
      summarizeList(
        listings,
        (l) => `- ${l.crop_name}: ${l.quantity} ${l.unit} @ ₹${l.unit_price}/${l.unit}, status=${l.status}`,
        'Marketplace listings'
      )
    );

    const orders = await findOrdersForFarmer(user.id);
    sections.push(
      summarizeList(
        orders,
        (o) => `- Order #${o.id}: ${o.crop_name}, qty=${o.quantity}, total=₹${o.total_price}, status=${o.status}`,
        'Orders received (as seller)'
      )
    );
  } else if (user.role === 'buyer') {
    const orders = await findOrdersForBuyer(user.id);
    sections.push(
      summarizeList(
        orders,
        (o) => `- Order #${o.id}: ${o.crop_name}, qty=${o.quantity}, total=₹${o.total_price}, status=${o.status}`,
        'Orders placed (as buyer)'
      )
    );
  }

  const reports = await findReportsForUser(user.id);
  sections.push(
    summarizeList(
      reports,
      (r) =>
        `- Report #${r.id} (${r.created_at.toISOString().slice(0, 10)}): "${r.description}" ` +
        `[category=${r.category}, severity=${r.severity}, status=${r.status}, location=${r.location || 'unspecified'}]`,
      'Field reports submitted'
    )
  );

  return sections.join('\n\n');
}
