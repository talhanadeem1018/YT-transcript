import { supabaseAdmin } from './supabaseAdmin';

export async function getUserFromRequest(req) {
  const header = req.headers.authorization || req.headers.Authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new Error('Missing bearer token.');
  }

  const token = header.replace('Bearer ', '').trim();
  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    throw new Error('Invalid or expired session.');
  }

  return user;
}
