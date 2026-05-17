import { getUserFromRequest } from './_lib/auth';
import { buildAccountSummary, ensureProfile } from './_lib/account';

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return json(res, 405, { error: 'Method not allowed.' });
  }

  try {
    const user = await getUserFromRequest(req);
    const profile = await ensureProfile(user);
    return json(res, 200, { account: buildAccountSummary(profile) });
  } catch (error) {
    return json(res, 400, { error: error.message || 'Could not load account.' });
  }
}
