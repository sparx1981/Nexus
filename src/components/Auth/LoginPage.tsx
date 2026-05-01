import React, { useState } from 'react';
import { Box, LogIn, Mail, Lock, AlertCircle, Loader2, UserPlus } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../lib/utils';
import { auth, loginWithGoogle } from '../../lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile 
} from 'firebase/auth';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const setUser = useAuthStore((state) => state.setUser);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Set a default display name for signups
        await updateProfile(userCredential.user, {
          displayName: email.split('@')[0]
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      // setUser is called by onAuthStateChanged in App.tsx
    } catch (err: any) {
      console.error('Auth error:', err);
      if (err.code === 'auth/user-not-found') {
        setError('No account found with this email. Would you like to sign up?');
      } else if (err.code === 'auth/wrong-password') {
        setError('Incorrect password. Please try again.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('An account already exists with this email.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else {
        setError(err.message || 'An error occurred during authentication.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error('Google Auth error:', err);
      setError(err.message || 'Failed to sign in with Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-slate-950 flex items-center justify-center p-4 transition-colors duration-300">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden -z-10">
        <div className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-primary-100/50 dark:bg-primary-900/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 bg-neutral-200/50 dark:bg-slate-800/20 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl shadow-neutral-200/50 dark:shadow-black/50 border border-neutral-100 dark:border-slate-800 p-8">
          <div className="flex flex-col items-center mb-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-primary-600 flex items-center justify-center mb-4 shadow-lg shadow-primary-200 dark:shadow-primary-900/40 transition-shadow">
              <Box className="text-white w-7 h-7" />
            </div>
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-white tracking-tight mb-1">Nexus</h1>
            <p className="text-neutral-500 dark:text-slate-400 font-medium tracking-tight">
              {isSignUp ? 'Create your account' : 'The AI-first low-code platform'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 bg-error-50 dark:bg-rose-950/30 border border-error-100 dark:border-rose-900/50 rounded-xl flex items-center gap-2 text-error-700 dark:text-rose-400 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="flex-1">{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-neutral-700 dark:text-slate-300">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 dark:text-slate-500" />
                <input
                  type="email"
                  value={email}
                  disabled={loading}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 dark:focus:border-primary-500 transition-all text-neutral-900 dark:text-white"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-neutral-700 dark:text-slate-300">Password</label>
                {!isSignUp && (
                  <a href="#" className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300">Forgot password?</a>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 dark:text-slate-500" />
                <input
                  type="password"
                  value={password}
                  disabled={loading}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 dark:focus:border-primary-500 transition-all text-neutral-900 dark:text-white"
                  required
                  min={6}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-primary-200 dark:shadow-primary-900/20 hover:bg-primary-700 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isSignUp ? (
                <>
                  Create Account
                  <UserPlus className="w-4 h-4" />
                </>
              ) : (
                <>
                  Sign In
                  <LogIn className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-sm font-bold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
              >
                {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
              </button>
            </div>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-200 dark:border-slate-800"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-widest">
                <span className="bg-white dark:bg-slate-900 px-3 text-neutral-400 dark:text-slate-500 font-bold italic">Or continue with</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-700 text-neutral-700 dark:text-slate-200 py-3 rounded-xl font-bold hover:bg-neutral-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Google
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleTrimbleLogin}
                disabled={loading}
                className="w-full bg-[#E8F0FE] border border-[#1A56DB] text-[#1A56DB] py-3 rounded-xl font-bold hover:bg-[#DBEAFE] transition-all flex items-center justify-center gap-2"
              >
                <Box className="w-4 h-4" /> Sign in with Trimble ID
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const TRIMBLE_CLIENT_ID = 'nexus_platform_dev';

const handleTrimbleLogin = () => {
    // TODO: A backend endpoint at /auth/trimble/callback is needed to exchange the code for tokens.
    window.location.href = `https://id.trimble.com/oauth/authorize?client_id=${TRIMBLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(window.location.origin + '/auth/trimble/callback')}&response_type=code&scope=openid profile email`;
};
