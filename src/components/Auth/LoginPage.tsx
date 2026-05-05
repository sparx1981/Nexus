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
        style={{ background: 'linear-gradient(145deg, #EDF4FF 0%, #E0EDFF 40%, #D4E6FF 70%, #C8DFFF 100%)' }}
      >
        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <path d="M 200 0 L 600 400 L 200 800" fill="none" stroke="#B8D4F8" strokeWidth="2" opacity="0.6"/>
          <path d="M 350 0 L 750 400 L 350 800" fill="none" stroke="#B8D4F8" strokeWidth="1.5" opacity="0.4"/>
          <rect x="120" y="80"  width="14" height="14" fill="none" stroke="#4B9FE8" strokeWidth="2"   opacity="0.7"/>
          <rect x="580" y="160" width="10" height="10" fill="none" stroke="#F59E0B" strokeWidth="2"   opacity="0.8"/>
          <rect x="820" y="500" width="16" height="16" fill="none" stroke="#F59E0B" strokeWidth="2"   opacity="0.6"/>
          <rect x="200" y="600" width="9"  height="9"  fill="none" stroke="#94BAE8" strokeWidth="1.5" opacity="0.5"/>
          <rect x="700" y="700" width="12" height="12" fill="none" stroke="#94BAE8" strokeWidth="1.5" opacity="0.5"/>
          <rect x="450" y="60"  width="8"  height="8"  fill="#B8D4F8" opacity="0.5"/>
          <rect x="750" y="300" width="6"  height="6"  fill="#94BAE8" opacity="0.4"/>
          <circle cx="520" cy="640" r="8"   fill="none" stroke="#2B6CB0" strokeWidth="1.5" opacity="0.4"/>
          <circle cx="160" cy="440" r="5"   fill="none" stroke="#2B6CB0" strokeWidth="1.5" opacity="0.35"/>
          <circle cx="900" cy="200" r="80"  fill="none" stroke="#B8D4F8" strokeWidth="1"   opacity="0.4"/>
          <circle cx="900" cy="200" r="130" fill="none" stroke="#B8D4F8" strokeWidth="0.8" opacity="0.25"/>
          <line x1="340" y1="270" x2="340" y2="290" stroke="#2B6CB0" strokeWidth="2"   opacity="0.35"/>
          <line x1="330" y1="280" x2="350" y2="280" stroke="#2B6CB0" strokeWidth="2"   opacity="0.35"/>
          <line x1="660" y1="520" x2="660" y2="540" stroke="#94BAE8" strokeWidth="1.5" opacity="0.4"/>
          <line x1="650" y1="530" x2="670" y2="530" stroke="#94BAE8" strokeWidth="1.5" opacity="0.4"/>
          <path d="M 500 150 L 780 350 L 500 550 Z" fill="#C8E0FF" opacity="0.3"/>
        </svg>
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm" style={{ background: '#1A56DB' }}>
            <Box className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight" style={{ color: '#1A2744' }}>Nexus</span>
        </div>
        <div className="relative z-10">
          <h2 className="text-4xl font-bold leading-tight mb-4" style={{ color: '#1A2744' }}>
            The AI-first<br/>low-code platform
          </h2>
          <p className="text-base leading-relaxed max-w-sm" style={{ color: '#4A6080' }}>
            Build applications, automate workflows, and analyse data — all without writing a line of code.
          </p>
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
            <Box className="w-5 h-5 text-white" />
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
                className="w-full px-3 py-2.5 border border-neutral-300 dark:border-slate-600 rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 bg-white dark:bg-slate-800 text-neutral-900 dark:text-white transition-all"
                required />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-neutral-700 dark:text-slate-300">Password</label>
                {!isSignUp && <a href="#" className="text-sm text-blue-600 hover:underline">Forgot password?</a>}
              </div>
              <input type="password" value={password} disabled={loading} onChange={(e) => setPassword(e.target.value)}
                placeholder={isSignUp ? 'Min. 6 characters' : '••••••••'}
                className="w-full px-3 py-2.5 border border-neutral-300 dark:border-slate-600 rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 bg-white dark:bg-slate-800 text-neutral-900 dark:text-white transition-all"
                required minLength={6} />
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-2.5 text-sm font-semibold text-white rounded-md transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
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
              className="w-full py-2.5 px-4 border border-neutral-300 dark:border-slate-600 rounded-md text-sm font-medium text-neutral-700 dark:text-slate-200 hover:bg-neutral-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2.5 disabled:opacity-50">
              <Box className="w-4 h-4 shrink-0" style={{ color: '#1A56DB' }} />
              Sign in with Trimble ID
            </button>

            {/* Google */}
            <button onClick={() => handleSSOLogin('google')} disabled={loading}
              className="w-full py-2.5 px-4 border border-neutral-300 dark:border-slate-600 rounded-md text-sm font-medium text-neutral-700 dark:text-slate-200 hover:bg-neutral-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2.5 disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin text-neutral-400" /> : <GoogleIcon />}
              Continue with Google
            </button>

            {/* Microsoft */}
            <button onClick={() => handleSSOLogin('microsoft')} disabled={loading}
              className="w-full py-2.5 px-4 border border-neutral-300 dark:border-slate-600 rounded-md text-sm font-medium text-neutral-700 dark:text-slate-200 hover:bg-neutral-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2.5 disabled:opacity-50">
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
