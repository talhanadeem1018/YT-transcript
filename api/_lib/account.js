import { supabaseAdmin } from './supabaseAdmin';

const DAILY_FREE_CREDITS = 1;
const OFFER_DURATION_DAYS = 7;

function addDays(baseDate, days) {
  const next = new Date(baseDate);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString();
}

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

export async function ensureProfile(user) {
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (fetchError) {
    throw fetchError;
  }

  if (existing) {
    return refreshDailyCredit(existing);
  }

  const payload = {
    id: user.id,
    email: user.email,
    credits_remaining: DAILY_FREE_CREDITS,
    last_credit_granted_on: todayStamp(),
    offer_started_at: new Date().toISOString(),
    offer_expires_at: addDays(new Date(), OFFER_DURATION_DAYS),
    billing_info: 'Billing not connected',
  };

  const { data, error } = await supabaseAdmin.from('profiles').insert(payload).select().single();
  if (error) {
    throw error;
  }

  return data;
}

export async function refreshDailyCredit(profile) {
  if (profile.last_credit_granted_on === todayStamp()) {
    return profile;
  }

  const nextCredits = Math.max(profile.credits_remaining, DAILY_FREE_CREDITS);
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({
      credits_remaining: nextCredits,
      last_credit_granted_on: todayStamp(),
    })
    .eq('id', profile.id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export function buildAccountSummary(profile) {
  const offerEndsAt = profile.offer_expires_at;
  const hasUnlimitedAccess = hasUnlimitedAccessForProfile(profile);

  return {
    creditsRemaining: profile.credits_remaining,
    billingInfo: profile.billing_info || 'Billing not connected',
    offerEndsAt,
    hasUnlimitedAccess,
  };
}

export function hasUnlimitedAccessForProfile(profile) {
  const offerEndsAt = profile.offer_expires_at;
  return offerEndsAt ? new Date(offerEndsAt) > new Date() : false;
}

export async function consumeCreditIfNeeded(profile) {
  const hasUnlimitedAccess = hasUnlimitedAccessForProfile(profile);

  if (hasUnlimitedAccess) {
    return profile;
  }

  if (profile.credits_remaining <= 0) {
    throw new Error('No credits remaining today. Please come back tomorrow or upgrade billing.');
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({ credits_remaining: profile.credits_remaining - 1 })
    .eq('id', profile.id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function refundCredit(profile) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({ credits_remaining: profile.credits_remaining + 1 })
    .eq('id', profile.id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}
