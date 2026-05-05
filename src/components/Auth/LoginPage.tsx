import React, { useState } from 'react';
import { Box, LogIn, AlertCircle, Loader2, UserPlus } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { auth, loginWithGoogle } from '../../lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile,
  OAuthProvider,
  signInWithPopup
} from 'firebase/auth';

// ── Microsoft MSAL-lite via Firebase OAuthProvider ────────────────────────────
const handleMicrosoftLogin = async () => {
  const provider = new OAuthProvider('microsoft.com');
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    await signInWithPopup(auth, provider);
  } catch (err: any) {
    // Re-throw so the component's catch block can show it
    throw err;
  }
};

// ── Trimble ID — OAuth 2.0 redirect ─────────────────────────────────────────
const handleTrimbleLogin = () => {
  const clientId = (import.meta as any).env.VITE_TRIMBLE_CLIENT_ID || 'nexus_platform_dev';
  const redirectUri = encodeURIComponent(window.location.origin + '/oauth/callback');
  window.location.href =
    `https://identity.trimble.com/i/oauth2/authorize` +
    `?response_type=code` +
    `&client_id=${clientId}` +
    `&redirect_uri=${redirectUri}` +
    `&scope=openid%20profile%20email`;
};

// ── SVG brand icons ───────────────────────────────────────────────────────────
const GoogleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

// Official Microsoft "four squares" logo
const MicrosoftIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 21 21" aria-hidden="true">
    <rect x="1"  y="1"  width="9" height="9" fill="#F25022"/>
    <rect x="11" y="1"  width="9" height="9" fill="#7FBA00"/>
    <rect x="1"  y="11" width="9" height="9" fill="#00A4EF"/>
    <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
  </svg>
);

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Please enter both email and password.'); return; }
    setLoading(true);
    try {
      if (isSignUp) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: email.split('@')[0] });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') setError('No account found. Would you like to sign up?');
      else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') setError('Incorrect email or password.');
      else if (err.code === 'auth/email-already-in-use') setError('An account already exists with this email.');
      else if (err.code === 'auth/weak-password') setError('Password should be at least 6 characters.');
      else setError(err.message || 'An error occurred.');
    } finally { setLoading(false); }
  };

  const handleSSOLogin = async (provider: 'google' | 'microsoft') => {
    setError(''); setLoading(true);
    try {
      if (provider === 'google') await loginWithGoogle();
      else await handleMicrosoftLogin();
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        // User dismissed — not an error
      } else if (err.code === 'auth/account-exists-with-different-credential') {
        setError('An account already exists with a different sign-in method for this email.');
      } else {
        setError(err.message || `Failed to sign in with ${provider === 'google' ? 'Google' : 'Microsoft'}.`);
      }
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* ── Left panel ──────────────────────────────────────────────────── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[58%] relative overflow-hidden p-14"
        style={{ background: 'linear-gradient(160deg, #E8F0FF 0%, #D8E8FF 25%, #C4DBFF 55%, #B0CCFC 80%, #9BBDF8 100%)' }}
      >
        {/* Rich geometric background */}
        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          {/* Large filled circle top-right */}
          <circle cx="85%" cy="-5%" r="340" fill="rgba(163,196,255,0.35)" />
          <circle cx="85%" cy="-5%" r="240" fill="rgba(140,180,255,0.25)" />
          {/* Diagonal band */}
          <polygon points="300,0 700,0 500,900 100,900" fill="rgba(180,210,255,0.18)" />
          {/* Lower-left filled circle */}
          <circle cx="5%" cy="95%" r="260" fill="rgba(120,165,245,0.22)" />
          <circle cx="5%" cy="95%" r="160" fill="rgba(100,150,240,0.15)" />
          {/* Mid accent shapes */}
          <rect x="55%" y="30%" width="180" height="180" rx="32" fill="none" stroke="rgba(120,170,255,0.35)" strokeWidth="2" transform="rotate(15,55%,30%)" />
          <rect x="58%" y="32%" width="120" height="120" rx="20" fill="rgba(150,190,255,0.12)" transform="rotate(15,58%,32%)" />
          {/* Small scattered geometry */}
          <rect x="18%" y="55%" width="22" height="22" rx="4" fill="none" stroke="rgba(100,155,235,0.5)" strokeWidth="1.5" />
          <rect x="70%" y="68%" width="16" height="16" rx="3" fill="rgba(100,155,235,0.3)" />
          <circle cx="38%" cy="78%" r="10" fill="none" stroke="rgba(100,155,235,0.4)" strokeWidth="1.5" />
          <circle cx="72%" cy="42%" r="6" fill="rgba(100,155,235,0.35)" />
          <line x1="0" y1="40%" x2="100%" y2="60%" stroke="rgba(140,180,255,0.2)" strokeWidth="1" />
          <line x1="0" y1="55%" x2="100%" y2="75%" stroke="rgba(140,180,255,0.15)" strokeWidth="0.8" />
          {/* Cross marks */}
          <g stroke="rgba(100,155,235,0.4)" strokeWidth="1.5" strokeLinecap="round">
            <line x1="25%" y1="calc(20%-6)" x2="25%" y2="calc(20%+6)" /><line x1="calc(25%-6)" y1="20%" x2="calc(25%+6)" y2="20%" />
            <line x1="60%" y1="calc(82%-6)" x2="60%" y2="calc(82%+6)" /><line x1="calc(60%-6)" y1="82%" x2="calc(60%+6)" y2="82%" />
          </g>
        </svg>
        <div className="relative z-10 flex items-center gap-3">
          {/* G-02: N monogram brand mark */}
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm" style={{ background: '#1A56DB' }}>
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 19V5h2.5l9 11V5H19v14h-2.5L7.5 8v11H5z" fill="white"/>
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight" style={{ color: '#1A2744' }}>Nexus</span>
        </div>
        <div className="relative z-10">
          <h2 className="text-4xl font-bold leading-tight mb-4" style={{ color: '#1A2744' }}>
            Build faster.<br/>Automate smarter.
          </h2>
          <p className="text-base leading-relaxed max-w-sm mb-10" style={{ color: '#4A6080' }}>
            The AI-first low-code platform for teams who move fast.
          </p>
          {/* G-03: Feature cards replacing rudimentary SVG */}
          <div className="space-y-3 max-w-sm">
            {[
              { icon: '⚡', title: 'Build apps visually', desc: 'Drag-and-drop builder with live data connections.' },
              { icon: '🔄', title: 'Automate workflows', desc: 'Trigger actions on data events, schedules, or webhooks.' },
              { icon: '📊', title: 'Analyse & report', desc: 'Dashboards and reports updated in real time.' },
            ].map(f => (
              <div key={f.title} className="flex items-start gap-3 p-3.5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.7)' }}>
                <span className="text-xl leading-none mt-0.5">{f.icon}</span>
                <div>
                  <p className="text-sm font-bold" style={{ color: '#1A2744' }}>{f.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#5A7090' }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10">
          <p className="text-xs" style={{ color: '#6B8CAE' }}>
            © {new Date().getFullYear()} Nexus Platform. All rights reserved.
          </p>
        </div>
      </div>

      {/* ── Right panel — sign-in form ────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-16 lg:px-20 bg-white dark:bg-slate-950">
        <div className="lg:hidden flex items-center gap-3 mb-10">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#1A56DB' }}>
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 19V5h2.5l9 11V5H19v14h-2.5L7.5 8v11H5z" fill="white"/>
            </svg>
          </div>
          <span className="text-lg font-bold tracking-tight text-neutral-900 dark:text-white">Nexus</span>
        </div>

        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold mb-1" style={{ color: '#1A1A2E' }}>
            {isSignUp ? 'Create account' : 'Sign In'}
          </h1>
          <p className="text-sm text-neutral-500 mb-6">
            {isSignUp ? (
              <>Already have an account?{' '}
                <button onClick={() => { setIsSignUp(false); setError(''); }} className="font-semibold text-blue-600 hover:underline">Sign in</button>
              </>
            ) : (
              <>New user?{' '}
                <button onClick={() => { setIsSignUp(true); setError(''); }} className="font-semibold text-blue-600 hover:underline">Create a Nexus ID</button>
              </>
            )}
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-700 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1.5">Email or username</label>
              <input type="email" value={email} disabled={loading} onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full px-3 py-2.5 border border-neutral-300 dark:border-slate-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 bg-white dark:bg-slate-800 text-neutral-900 dark:text-white transition-all"
                required />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-neutral-700 dark:text-slate-300">Password</label>
                {!isSignUp && <a href="#" className="text-sm text-blue-600 hover:underline">Forgot password?</a>}
              </div>
              <input type="password" value={password} disabled={loading} onChange={(e) => setPassword(e.target.value)}
                placeholder={isSignUp ? 'Min. 6 characters' : '••••••••'}
                className="w-full px-3 py-2.5 border border-neutral-300 dark:border-slate-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 bg-white dark:bg-slate-800 text-neutral-900 dark:text-white transition-all"
                required minLength={6} />
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-2.5 text-sm font-semibold text-white rounded-xl transition-all hover:brightness-110 hover:-translate-y-px hover:shadow-md active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: '#1A56DB' }}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : isSignUp ? <><UserPlus className="w-4 h-4" /> Create Account</> : <>Next</>}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 border-t border-neutral-200 dark:border-slate-700" />
            <span className="text-sm text-neutral-400">or</span>
            <div className="flex-1 border-t border-neutral-200 dark:border-slate-700" />
          </div>

          <div className="space-y-3">
            {/* Trimble ID */}
            <button onClick={handleTrimbleLogin} disabled={loading}
              className="w-full py-2.5 px-4 border border-neutral-300 dark:border-slate-600 rounded-xl text-sm font-medium text-neutral-700 dark:text-slate-200 hover:bg-neutral-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2.5 disabled:opacity-50">
              <Box className="w-4 h-4 shrink-0" style={{ color: '#1A56DB' }} />
              Sign in with Trimble ID
            </button>

            {/* Google */}
            <button onClick={() => handleSSOLogin('google')} disabled={loading}
              className="w-full py-2.5 px-4 border border-neutral-300 dark:border-slate-600 rounded-xl text-sm font-medium text-neutral-700 dark:text-slate-200 hover:bg-neutral-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2.5 disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin text-neutral-400" /> : <GoogleIcon />}
              Continue with Google
            </button>

            {/* Microsoft */}
            <button onClick={() => handleSSOLogin('microsoft')} disabled={loading}
              className="w-full py-2.5 px-4 border border-neutral-300 dark:border-slate-600 rounded-xl text-sm font-medium text-neutral-700 dark:text-slate-200 hover:bg-neutral-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2.5 disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin text-neutral-400" /> : <MicrosoftIcon />}
              Continue with Microsoft
            </button>
          </div>

          <div className="mt-6 flex items-center gap-2">
            <input type="checkbox" id="remember" className="rounded" defaultChecked />
            <label htmlFor="remember" className="text-sm text-neutral-600 dark:text-slate-400">Remember me</label>
          </div>
        </div>
      </div>
    </div>
  );
};
