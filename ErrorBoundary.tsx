// ErrorBoundary.tsx — Catches React render or initialization failures with visible recovery UI

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { clearAllDbData } from './storage';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Vij runtime error:', error, info.componentStack);
  }

  handleReset = () => {
    clearAllDbData().finally(() => window.location.reload());
  };

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-[#090d16] text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-[#111827] border border-rose-500/40 rounded-lg p-6 space-y-4">
            <h1 className="font-display text-lg font-semibold text-rose-300">Vij encountered a startup error</h1>
            <p className="text-xs text-slate-300 font-mono whitespace-pre-wrap break-words bg-[#090d16] border border-slate-800 rounded p-3">
              {this.state.error.message || 'Unknown application error'}
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-3.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-100 cursor-pointer"
              >
                Reload Page
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="px-3.5 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-xs font-semibold text-slate-950 cursor-pointer"
              >
                Reset Saved City &amp; Reload
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
