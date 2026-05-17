import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

const EMAIL_RETRY_SECONDS = 60;

const stepsByMode = {
  login: [
    'Enter your email',
    'Enter your password',
    'Continue to your transcript workspace',
  ],
  signup: [
    'Fill in your name and email',
    'Create and confirm your password',
    'Account is created and signed in',
  ],
};

function explainAuthIssue(error) {
  const raw = error?.message || 'Authentication failed.';
  const normalized = raw.toLowerCase();

  if (normalized.includes('email rate limit exceeded')) {
    return `Too many auth emails were requested. Supabase usually enforces a ${EMAIL_RETRY_SECONDS}-second cooldown for the same signup email, and your project can also hit its hourly email cap. Wait 1 minute first. If it still fails, wait 10 to 30 minutes and try again.`;
  }

  if (normalized.includes('user already registered')) {
    return 'This email already has an account. Switch to Login and use the same email and password.';
  }

  if (normalized.includes('email not confirmed')) {
    return 'Your account exists but the email is not confirmed yet. Open the Supabase confirmation email, then login again.';
  }

  if (normalized.includes('invalid login credentials')) {
    return 'Email or password is incorrect. If you created the account just now, confirm the email first and then login.';
  }

  return raw;
}

export default function AuthModal({ open, onClose, onSuccess }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [emailCooldownUntil, setEmailCooldownUntil] = useState(null);
  const authAvailable = Boolean(supabase);

  useEffect(() => {
    if (!open) return;
    setMessage('');
  }, [open, mode]);

  const actionLabel = useMemo(() => {
    if (loading) return 'Please wait...';
    return mode === 'login' ? 'Login to Continue' : 'Create Account';
  }, [loading, mode]);

  const cooldownSecondsLeft = emailCooldownUntil
    ? Math.max(0, Math.ceil((emailCooldownUntil - Date.now()) / 1000))
    : 0;

  if (!open) return null;

  async function handleSubmit(event) {
    event.preventDefault();

    if (!supabase) {
      setMessage('Supabase environment variables are missing.');
      return;
    }

    if (mode === 'signup') {
      if (cooldownSecondsLeft > 0) {
        setMessage(`Please wait ${cooldownSecondsLeft} seconds before requesting another signup email.`);
        return;
      }

      if (!name.trim()) {
        setMessage('Please enter your name.');
        return;
      }

      if (password !== confirmPassword) {
        setMessage('Password and confirm password must match.');
        return;
      }
    }

    setLoading(true);
    setMessage('');

    try {
      if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
          throw error;
        }

        onSuccess?.({
          mode,
          session: data.session,
          user: data.user,
          confirmation: 'Welcome back. You are now signed in.',
        });
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name.trim(),
          },
        },
      });

      if (error) {
        throw error;
      }

      const signedInNow = Boolean(data.session);
      if (!signedInNow) {
        setEmailCooldownUntil(Date.now() + EMAIL_RETRY_SECONDS * 1000);
      }
      onSuccess?.({
        mode,
        session: data.session,
        user: data.user,
        confirmation: signedInNow
          ? 'Account created successfully. You are now signed in.'
          : 'Account created successfully. Check your email for confirmation, then login with the same details.',
      });
    } catch (error) {
      setMessage(explainAuthIssue(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <button className="ghost-button close-button" onClick={onClose} type="button">
          Close
        </button>

        <p className="eyebrow">Unlock your first transcript</p>
        <h3>Your first generation is free, but you need to login or signup first.</h3>
        <p className="muted">
          Use signup once to create your account. Next time, login with the same email and password
          to continue from your saved history.
        </p>

        <p className="muted tiny">
          Supabase auth note: signup confirmation emails usually have a 60-second per-email cooldown.
        </p>

        <div className="auth-steps">
          {stepsByMode[mode].map((step, index) => (
            <div className="auth-step" key={step}>
              <span>{index + 1}</span>
              <p>{step}</p>
            </div>
          ))}
        </div>

        {!authAvailable ? (
          <p className="inline-message">
            Login is temporarily unavailable because Supabase keys are missing in `.env`.
          </p>
        ) : null}

        <div className="auth-toggle">
          <button
            className={mode === 'login' ? 'tab active' : 'tab'}
            type="button"
            onClick={() => setMode('login')}
            disabled={!authAvailable}
          >
            Login
          </button>
          <button
            className={mode === 'signup' ? 'tab active' : 'tab'}
            type="button"
            onClick={() => setMode('signup')}
            disabled={!authAvailable}
          >
            Signup
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'signup' ? (
            <label>
              Name
              <input
                type="text"
                placeholder="Your full name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                disabled={!authAvailable}
              />
            </label>
          ) : null}

          <label>
            Email
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={!authAvailable}
            />
          </label>

          <label>
            Password
            <input
              type="password"
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
              disabled={!authAvailable}
            />
          </label>

          {mode === 'signup' ? (
            <label>
              Confirm password
              <input
                type="password"
                placeholder="Retype your password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                minLength={6}
                disabled={!authAvailable}
              />
            </label>
          ) : null}

          <button className="primary-button" disabled={loading || !authAvailable} type="submit">
            {actionLabel}
          </button>
        </form>

        {mode === 'signup' && cooldownSecondsLeft > 0 ? (
          <p className="auth-footer-note">
            Please wait {cooldownSecondsLeft} seconds before asking Supabase to send another signup email.
          </p>
        ) : null}

        <p className="auth-footer-note">
          {mode === 'login'
            ? 'Already created an account before? Use the same login details here.'
            : 'After account creation, use the same email and password next time to login.'}
        </p>

        {message ? <p className="inline-message">{message}</p> : null}
      </div>
    </div>
  );
}
