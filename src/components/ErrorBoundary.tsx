import * as React from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';

interface Props {
  children?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Try to parse JSON error from firestore handlers
      let displayMessage = this.state.error?.message || 'Something went wrong';
      try {
        if (displayMessage && displayMessage.startsWith('{')) {
          const parsed = JSON.parse(displayMessage);
          displayMessage = parsed.error || displayMessage;
        }
      } catch (e) {
        // Not JSON
      }

      const isDark = document.documentElement.classList.contains('dark');

      return (
        <div className={`min-h-screen ${isDark ? 'bg-slate-950 text-white' : 'bg-neutral-50 text-neutral-900'} flex items-center justify-center p-6 transition-colors duration-300`}>
          <div className={`${isDark ? 'bg-slate-900 border-slate-800 shadow-black/50' : 'bg-white border-neutral-100 shadow-neutral-200/50'} rounded-3xl shadow-2xl p-8 max-w-md w-full text-center border`}>
            <div className={`w-16 h-16 ${isDark ? 'bg-rose-900/30 text-rose-400' : 'bg-rose-50 text-rose-600'} rounded-2xl flex items-center justify-center mx-auto mb-6`}>
              <AlertCircle className="w-10 h-10" />
            </div>
            <h1 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-neutral-900'} mb-2`}>Application Error</h1>
            <p className={`${isDark ? 'text-slate-400' : 'text-neutral-500'} mb-8 font-medium leading-relaxed font-sans`}>
              {displayMessage}
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-primary-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-primary-700 transition-all shadow-lg shadow-primary-200 dark:shadow-primary-900/20"
            >
              <RefreshCcw className="w-5 h-5" /> Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
