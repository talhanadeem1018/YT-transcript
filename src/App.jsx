import { useEffect, useState } from 'react';
import AuthModal from './components/AuthModal';
import { supabase } from './lib/supabase';
import { formatDate, normalizeYoutubeInput } from './lib/youtube';

const initialAccount = {
  creditsRemaining: 0,
  billingInfo: 'Billing not connected',
  offerEndsAt: null,
  hasUnlimitedAccess: false,
};

export default function App() {
  const [session, setSession] = useState(null);
  const [videoInput, setVideoInput] = useState('');
  const [transcript, setTranscript] = useState('');
  const [transcriptMeta, setTranscriptMeta] = useState(null);
  const [history, setHistory] = useState([]);
  const [account, setAccount] = useState(initialAccount);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [activePanel, setActivePanel] = useState('history');
  const hasSupabaseAuth = Boolean(supabase);
  const profileName =
    session?.user?.user_metadata?.full_name ||
    session?.user?.email?.split('@')[0] ||
    'Guest user';
  const profileInitials = profileName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'GU';

  useEffect(() => {
    if (!supabase) return undefined;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.access_token) {
      setHistory([]);
      setAccount(initialAccount);
      return;
    }

    hydrateDashboard(session.access_token);
  }, [session?.access_token]);

  async function hydrateDashboard(token) {
    try {
      const [historyResponse, accountResponse] = await Promise.all([
        fetch('/api/history', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/account', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const historyData = await historyResponse.json();
      const accountData = await accountResponse.json();

      if (historyResponse.ok) {
        setHistory(historyData.history ?? []);
      }

      if (accountResponse.ok) {
        setAccount(accountData.account ?? initialAccount);
      }
    } catch (error) {
      setMessage(error.message || 'Could not load your account data.');
    }
  }

  async function handleGenerate() {
    const parsed = normalizeYoutubeInput(videoInput);
    if (!parsed.isValid) {
      setMessage(parsed.reason);
      return;
    }

    if (!session?.access_token) {
      setAuthModalOpen(true);
      setMessage('Login or signup is required before your first free generation.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/generate-transcript', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ videoInput: parsed.canonicalUrl, videoId: parsed.videoId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Transcript generation failed.');
      }

      setTranscript(data.transcript);
      setTranscriptMeta(data.meta);
      setVideoInput(parsed.canonicalUrl);
      setActivePanel('history');
      setMessage(data.message || 'Transcript generated successfully.');
      await hydrateDashboard(session.access_token);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!transcript) return;

    try {
      await navigator.clipboard.writeText(transcript);
      setMessage('Transcript copied to clipboard.');
    } catch {
      setMessage('Clipboard copy failed. Please copy the transcript manually.');
    }
  }

  async function handleLogout() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setTranscript('');
    setTranscriptMeta(null);
    setMessage('You have been logged out.');
  }

  function openManualLogin() {
    setAuthModalOpen(true);
    setMessage(hasSupabaseAuth ? '' : 'Add valid Supabase keys in .env to enable login and signup.');
  }

  const offerText = account.offerEndsAt
    ? `Limited Time Offer - Generate Unlimited Transcripts For 7 Days - Ends ${formatDate(
        account.offerEndsAt,
      )}`
    : 'Limited Time Offer - Generate Unlimited Transcripts For 7 Days';

  return (
    <div className="page-shell">
      <div className="promo-strip">{offerText}</div>

      <main className="app-shell">
        <header className="topbar">
          <div className="brand-lockup">
            <span className="brand-mark">TF</span>
            <div className="brand-copy">
              <p className="eyebrow compact">Transcript Flow</p>
              <strong>{session ? profileName : 'Guest mode'}</strong>
            </div>
          </div>

          <div className="topbar-actions">
            {session ? (
              <div className="profile-chip">
                <span className="profile-avatar" aria-hidden="true">
                  {profileInitials}
                </span>
                <div className="profile-copy">
                  <strong>{profileName}</strong>
                  <span>{session.user.email}</span>
                </div>
                <button className="ghost-button" type="button" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            ) : (
              <button className="login-chip" type="button" onClick={openManualLogin}>
                <span className="login-icon" aria-hidden="true">
                  LG
                </span>
                <span>Login / Signup</span>
              </button>
            )}
          </div>
        </header>

        <section className="hero-card">
          <div className="hero-copy">
            <p className="eyebrow">Fast transcript workspace</p>
            <h1>Turn any YouTube link into a clean transcript.</h1>
            <p className="muted">
              Paste a full link, share link, Shorts URL, or video ID. We normalize it, generate
              the transcript, and keep your history in one place.
            </p>
            <div className="hero-points">
              <span>Daily free credit</span>
              <span>7-day unlimited offer</span>
              <span>Saved history</span>
            </div>
          </div>

          <div className="input-card">
            <label htmlFor="youtube-link">YouTube video link or ID</label>
            <div className="input-row">
              <input
                id="youtube-link"
                type="text"
                placeholder="Paste with Ctrl + V or Cmd + V"
                value={videoInput}
                onChange={(event) => setVideoInput(event.target.value)}
              />
              <button className="primary-button" disabled={loading} onClick={handleGenerate} type="button">
                {loading ? 'Generating...' : 'Generate Transcript'}
              </button>
            </div>
            <p className="muted tiny">Supports watch, share, Shorts, embed, live, and raw video ID input.</p>
            {message ? <p className="inline-message">{message}</p> : null}
          </div>
        </section>

        <section className="dashboard-grid">
          <article className="transcript-card">
            <div className="section-head">
              <div>
                <p className="eyebrow">Latest Result</p>
                <h2>Transcript Output</h2>
              </div>
              <button className="ghost-button" type="button" onClick={handleCopy} disabled={!transcript}>
                Copy Transcript
              </button>
            </div>

            {transcriptMeta ? (
              <div className="result-meta">
                <span>{transcriptMeta.title || 'Untitled video'}</span>
                <span>{transcriptMeta.language || 'Unknown language'}</span>
                <span>{transcriptMeta.method || 'captions'}</span>
              </div>
            ) : null}

            <div className="transcript-box">
              {transcript || 'Your generated transcript will appear here in a clean reading layout.'}
            </div>
          </article>

          <aside className="side-panel">
            <div className="panel-switch">
              <button
                className={activePanel === 'history' ? 'tab active' : 'tab'}
                onClick={() => setActivePanel('history')}
                type="button"
              >
                History
              </button>
              <button
                className={activePanel === 'account' ? 'tab active' : 'tab'}
                onClick={() => setActivePanel('account')}
                type="button"
              >
                Account Settings
              </button>
            </div>

            {activePanel === 'history' ? (
              <div className="panel-card">
                <div className="section-head tight">
                  <div>
                    <p className="eyebrow">Saved Transcripts</p>
                    <h3>History</h3>
                  </div>
                </div>
                <div className="history-list">
                  {history.length ? (
                    history.map((item) => (
                      <button
                        key={item.id}
                        className="history-item"
                        type="button"
                        onClick={() => {
                          setTranscript(item.transcript);
                          setTranscriptMeta({
                            title: item.video_title,
                            language: item.language,
                            method: item.transcript_method,
                          });
                        }}
                      >
                        <strong>{item.video_title || item.video_id}</strong>
                        <span>{formatDate(item.created_at)}</span>
                        <span>{item.video_url}</span>
                      </button>
                    ))
                  ) : (
                    <p className="muted">Login and generate transcripts to start building history.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="panel-card">
                <div className="section-head tight">
                  <div>
                    <p className="eyebrow">Account Overview</p>
                    <h3>Settings</h3>
                  </div>
                </div>

                <div className="stats-grid">
                  <div className="stat-tile">
                    <span>Remaining credits</span>
                    <strong>{account.hasUnlimitedAccess ? 'Unlimited' : account.creditsRemaining}</strong>
                  </div>
                  <div className="stat-tile">
                    <span>Billing info</span>
                    <strong>{account.billingInfo}</strong>
                  </div>
                  <div className="stat-tile">
                    <span>Active offer</span>
                    <strong>
                      {account.offerEndsAt ? `Active until ${formatDate(account.offerEndsAt)}` : 'No active offer'}
                    </strong>
                  </div>
                  <div className="stat-tile">
                    <span>Signed in as</span>
                    <strong>{session?.user?.email || 'Guest user'}</strong>
                  </div>
                </div>
              </div>
            )}
          </aside>
        </section>
      </main>

      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={({ confirmation }) => {
          setAuthModalOpen(false);
          setMessage(confirmation || 'Authentication complete. You can now generate your transcript.');
        }}
      />
    </div>
  );
}
