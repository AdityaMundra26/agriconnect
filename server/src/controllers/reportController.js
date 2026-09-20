import { classifyFieldReport } from '../services/aiService.js';
import { findPlotWithOwner } from '../models/plotModel.js';
import {
  createFieldReport,
  findReportById,
  findReportsForUser,
  findAllReports,
  updateReportStatus,
  addStatusHistory,
  findStatusHistory,
} from '../models/reportModel.js';

const REPORT_STATUSES = ['open', 'in_progress', 'resolved', 'rejected'];

export async function createReport(req, res, next) {
  try {
    const { description, plotId } = req.body;
    if (!description || !description.trim()) {
      return res.status(400).json({ error: 'description is required' });
    }

    if (plotId) {
      const plot = await findPlotWithOwner(plotId);
      if (!plot || plot.owner_id !== req.user.id) {
        return res.status(403).json({ error: 'You do not own this plot' });
      }
    }

    const classification = await classifyFieldReport(description);

    const report = await createFieldReport({
      userId: req.user.id,
      plotId: plotId ?? null,
      description,
      category: classification.category,
      severity: classification.severity,
      location: classification.location,
    });

    await addStatusHistory(report.id, 'open', req.user.id);

    res.status(201).json({ report });
  } catch (err) {
    next(err);
  }
}

export async function listReports(req, res, next) {
  try {
    if (req.user.role === 'admin') {
      const { status, severity, category } = req.query;
      const reports = await findAllReports({ status, severity, category });
      return res.json({ reports });
    }
    const reports = await findReportsForUser(req.user.id);
    res.json({ reports });
  } catch (err) {
    next(err);
  }
}

export async function getReport(req, res, next) {
  try {
    const report = await findReportById(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    if (req.user.role !== 'admin' && report.user_id !== req.user.id) {
      return res.status(403).json({ error: 'You do not own this report' });
    }

    const history = await findStatusHistory(report.id);
    res.json({ report, history });
  } catch (err) {
    next(err);
  }
}

export async function updateStatus(req, res, next) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can update report status' });
    }

    const { status } = req.body;
    if (!REPORT_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of ${REPORT_STATUSES.join(', ')}` });
    }

    const existing = await findReportById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const updated = await updateReportStatus(req.params.id, status);
    await addStatusHistory(req.params.id, status, req.user.id);

    res.json({ report: updated });
  } catch (err) {
    next(err);
  }
}
