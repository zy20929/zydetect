'use client';

import { Component, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/** 错误边界 — 捕获子组件运行时/渲染错误，显示降级 UI */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="rounded-xl border border-red-500/30 bg-red-950/30 p-6 text-center">
          <AlertTriangle size={32} className="mx-auto mb-3 text-red-400" />
          <h3 className="text-sm font-semibold text-red-300 mb-1">组件加载失败</h3>
          <p className="text-xs text-red-400/70 mb-4">
            {this.state.error?.message || '渲染过程中出现异常'}
          </p>
          <button
            onClick={this.handleReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-900/50 border border-red-500/30 text-red-300 text-xs font-medium hover:bg-red-900/70 transition-colors"
          >
            <RotateCcw size={12} />
            重新加载
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
