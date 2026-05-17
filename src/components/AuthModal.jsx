import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function AuthModal({ open, onClose, onSuccess }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const authAvailable = Boolean(supabase);

  if (!open) return null;

  async function handleSubmit(event) {
    event.preventDefault();
    if (!supabase) {
      setMessage('Supabase environment variables are missing.');
      return;
    }

    setLoading(true);
    setMessage('');

    const action =
      mode === 'login'
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({ email, password });

    const { error } = await action;
    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(
      mode === 'signup'
        ? 'Account created. Check your inbox if email confirmation is enabled.'
        : 'Logged in successfully.',
    );
    onSuccess?.();
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
          Sign in once and we will also save your transcript history, remaining credits, and active
          7-day offer.
        </p>

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
          <button className="primary-button" disabled={loading || !authAvailable} type="submit">
            {loading ? 'Please wait...' : mode === 'login' ? 'Continue to Transcript' : 'Create Account'}
          </button>
        </form>

        {message ? <p className="inline-message">{message}</p> : null}
      </div>
    </div>
  );
}
