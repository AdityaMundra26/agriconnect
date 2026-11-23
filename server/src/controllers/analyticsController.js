import {
  getReportCategoryCounts,
  getReportSeverityCounts,
  getReportStatusCounts,
  getReportsOverTime,
  getOrderVolumeOverTime,
  getTopCrops,
  getOrdersByStatus,
  getMarketplaceTotals,
  getYieldByCrop,
  getYieldOverTime,
  getCycleStatusCounts,
} from '../models/analyticsModel.js';

export async function reportsAnalytics(req, res, next) {
  try {
    const isAdmin = req.user.role === 'admin';
    const [byCategory, bySeverity, byStatus, overTime] = await Promise.all([
      getReportCategoryCounts(req.user.id, isAdmin),
      getReportSeverityCounts(req.user.id, isAdmin),
      getReportStatusCounts(req.user.id, isAdmin),
      getReportsOverTime(req.user.id, isAdmin),
    ]);
    res.json({ byCategory, bySeverity, byStatus, overTime });
  } catch (err) {
    next(err);
  }
}

export async function marketplaceAnalytics(req, res, next) {
  try {
    const { role, id } = req.user;
    const [orderVolume, topCrops, ordersByStatus, totals] = await Promise.all([
      getOrderVolumeOverTime(role, id),
      getTopCrops(role, id),
      getOrdersByStatus(role, id),
      getMarketplaceTotals(role, id),
    ]);
    res.json({ orderVolume, topCrops, ordersByStatus, totals });
  } catch (err) {
    next(err);
  }
}

export async function yieldAnalytics(req, res, next) {
  try {
    const { role, id } = req.user;
    if (role === 'buyer') {
      return res.json({ byCrop: [], overTime: [], cycleStatus: [] });
    }
    const [byCrop, overTime, cycleStatus] = await Promise.all([
      getYieldByCrop(role, id),
      getYieldOverTime(role, id),
      getCycleStatusCounts(role, id),
    ]);
    res.json({ byCrop, overTime, cycleStatus });
  } catch (err) {
    next(err);
  }
}
