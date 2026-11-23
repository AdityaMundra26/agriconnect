import { farmerSummary, buyerSummary, adminSummary, listUsersWithActivity } from '../models/dashboardModel.js';

export async function summary(req, res, next) {
  try {
    const { role, id } = req.user;
    if (role === 'farmer') return res.json({ role, ...(await farmerSummary(id)) });
    if (role === 'buyer') return res.json({ role, ...(await buyerSummary(id)) });
    res.json({ role, ...(await adminSummary()) });
  } catch (err) {
    next(err);
  }
}

export async function adminUsers(req, res, next) {
  try {
    res.json({ users: await listUsersWithActivity() });
  } catch (err) {
    next(err);
  }
}
