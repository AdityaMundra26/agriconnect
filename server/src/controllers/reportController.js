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
import { notify } from '../services/notificationService.js';
import { alertAdmins } from '../services/alertService.js';

const REPORT_STATUSES = ['open', 'in_progress', 'resolved', 'rejected'];
const MAX_DESCRIPTION = 2000;

export async function createReport(req, res, next) {
  try {
    if (req.user.role === 'admin') {
      return res.status(403).json({ error: 'Admins moderate reports rather than file them' });
    }
    const { plotId } = req.body;
    const description = typeof req.body.description === 'string' ? req.body.description.trim() : '';
    if (!description) return res.status(400).json({ error: 'description is required' });
    if (description.length < 10) return res.status(400).json({ error: 'Please describe the issue in a bit more detail (10+ characters)' });
    if (description.length > MAX_DESCRIPTION) {
      return res.status(400).json({ error: `description must be under ${MAX_DESCRIPTION} characters` });
    }

    let plot = null;
    if (plotId) {
      plot = await findPlotWithOwner(plotId);
      if (!plot || plot.owner_id !== req.user.id) {
        return res.status(403).json({ error: 'You do not own this plot' });
      }
    }

    const classification = await classifyFieldReport(description);

    const report = await createFieldReport({
      userId: req.user.id,
      plotId: plot ? plot.id : null,
      description,
      category: classification.category,
      severity: classification.severity,
      location: classification.location || (plot ? plot.name : null),
      aiClassified: classification.aiClassified,
    });

    await addStatusHistory(report.id, 'open', req.user.id, 'Report submitted');

    // Critical issues phone the admins (voice call) so they're seen immediately;
    // high-severity ones go out as SMS.
    if (report.severity === 'critical' || report.severity === 'high') {
      const text = `${report.severity} ${report.category} report #${report.id} from ${report.reporter_name}: ${description.slice(0, 120)}`;
      alertAdmins(report.severity === 'critical' ? 'voice' : 'sms', text);
    }

    res.status(201).json({ report });
  } catch (err) {
    next(err);
  }
}

export async function listReports(req, res, next) {
  try {
    if (req.user.role === 'admin') {
      const { status, severity, category } = req.query;
      return res.json({ reports: await findAllReports({ status, severity, category }) });
    }
    res.json({ reports: await findReportsForUser(req.user.id) });
  } catch (err) {
    next(err);
  }
}

export async function getReport(req, res, next) {
  try {
    const report = await findReportById(req.params.id);
    if (!report) return res.status(404).json({ error: 'Report not found' });
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
    const note = typeof req.body.note === 'string' ? req.body.note.trim().slice(0, 500) : null;
    if (!REPORT_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of ${REPORT_STATUSES.join(', ')}` });
    }

    const existing = await findReportById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Report not found' });
    if (existing.status === status && !note) {
      return res.json({ report: existing });
    }

    const updated = await updateReportStatus(req.params.id, status);
    await addStatusHistory(req.params.id, status, req.user.id, note || null);

    await notify(
      existing.user_id,
      `Your ${existing.category || ''} report #${existing.id} is now ${status.replace('_', ' ')}${note ? `: ${note}` : ''}`,
      { type: 'report', link: '/reports', sms: true }
    );

    res.json({ report: updated });
  } catch (err) {
    next(err);
  }
}
