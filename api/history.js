import { getUserFromRequest } from './_lib/auth';
import { ensureProfile } from './_lib/account';
import { supabaseAdmin } from './_lib/supabaseAdmin';

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
    await ensureProfile(user);

    const { data, error } = await supabaseAdmin
      .from('transcripts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      throw error;
    }

    return json(res, 200, { history: data ?? [] });
  } catch (error) {
    return json(res, 400, { error: error.message || 'Could not load history.' });
  }
}
