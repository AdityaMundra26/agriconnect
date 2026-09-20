import {
  getReportCategoryCounts,
  getReportSeverityCounts,
  getReportStatusCounts,
  getReportsOverTime,
  getOrderVolumeOverTime,
  getTopCrops,
  getOrdersByStatus,
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
    const [orderVolume, topCrops, ordersByStatus] = await Promise.all([
      getOrderVolumeOverTime(role, id),
      getTopCrops(role, id),
      getOrdersByStatus(role, id),
    ]);
    res.json({ orderVolume, topCrops, ordersByStatus });
  } catch (err) {
    next(err);
  }
}
