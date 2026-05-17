import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

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

export default function AuthModal({ open, onClose, onSuccess }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const authAvailable = Boolean(supabase);

  useEffect(() => {
    if (!open) return;
    setMessage('');
  }, [open, mode]);

  const actionLabel = useMemo(() => {
    if (loading) return 'Please wait...';
    return mode === 'login' ? 'Login to Continue' : 'Create Account';
  }, [loading, mode]);

  if (!open) return null;

  async function handleSubmit(event) {
    event.preventDefault();

    if (!supabase) {
      setMessage('Supabase environment variables are missing.');
      return;
    }

    if (mode === 'signup') {
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
      onSuccess?.({
        mode,
        session: data.session,
        user: data.user,
        confirmation: signedInNow
          ? 'Account created successfully. You are now signed in.'
          : 'Account created successfully. Please confirm your email, then login.',
      });
    } catch (error) {
      setMessage(error.message || 'Authentication failed.');
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
