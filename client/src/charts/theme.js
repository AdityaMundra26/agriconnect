// Validated palette values (dataviz skill references/palette.md). Dark mode uses
// the palette's own dark steps, not an automatic flip. Do not eyeball new hex
// values here - only reuse these documented roles.
import { useTheme } from '../context/ThemeContext.jsx';

// Status palette is fixed across themes (never themed).
const STATUS = { good: '#0ca30c', warning: '#fab219', serious: '#ec835a', critical: '#d03b3b' };

const THEMES = {
  light: {
    seq: '#2a78d6', // sequential blue, step 450
    seq2: '#eb6834', // categorical slot 2 (orange) - second sequential context
    green: '#008300', // categorical slot 6
    grid: '#e1e0d9',
    axis: '#898781',
    baseline: '#c3c2b7',
    surface: '#fcfcfb',
    orderStatus: { pending: '#2a78d6', confirmed: '#1baf7a', shipped: '#eda100', delivered: '#008300', cancelled: '#e34948' },
  },
  dark: {
    seq: '#3987e5', // step 400 for the dark surface
    seq2: '#d95926',
    green: '#008300',
    grid: '#2c2c2a',
    axis: '#898781',
    baseline: '#383835',
    surface: '#1a1a19',
    orderStatus: { pending: '#3987e5', confirmed: '#199e70', shipped: '#c98500', delivered: '#008300', cancelled: '#e66767' },
  },
};

export const SEVERITY_COLORS = { low: STATUS.good, medium: STATUS.warning, high: STATUS.serious, critical: STATUS.critical };
export const REPORT_STATUS_COLORS = { open: STATUS.serious, in_progress: STATUS.warning, resolved: STATUS.good, rejected: '#898781' };

export function useChartTheme() {
  const { theme } = useTheme();
  return THEMES[theme] || THEMES.light;
}
