// Validated palette values (see dataviz skill references/palette.md) - do not
// eyeball new hex values here, only reuse these documented roles.

export const SEQUENTIAL_BLUE = '#2a78d6'; // sequential hue, step 450 - default magnitude series
export const SEQUENTIAL_ORANGE = '#eb6834'; // categorical slot 2 - second sequential context (revenue)

export const STATUS_COLORS = {
  good: '#0ca30c',
  warning: '#fab219',
  serious: '#ec835a',
  critical: '#d03b3b',
};

export const SEVERITY_COLORS = {
  low: STATUS_COLORS.good,
  medium: STATUS_COLORS.warning,
  high: STATUS_COLORS.serious,
  critical: STATUS_COLORS.critical,
};

export const REPORT_STATUS_COLORS = {
  open: STATUS_COLORS.serious,
  in_progress: STATUS_COLORS.warning,
  resolved: STATUS_COLORS.good,
  rejected: '#898781', // muted ink - closed without action, not a severity state
};

// Categorical slots 1/3/4/6/8, kept in their fixed relative order.
export const ORDER_STATUS_COLORS = {
  pending: '#2a78d6',
  confirmed: '#1baf7a',
  shipped: '#eda100',
  delivered: '#008300',
  cancelled: '#e34948',
};

export const CHART_CHROME = {
  grid: '#e1e0d9',
  axis: '#898781',
  ink: '#0b0b0b',
};
