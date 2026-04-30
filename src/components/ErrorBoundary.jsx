import React from "react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-screen items-center justify-center bg-slate-100 p-6 text-ink">
          <div className="max-w-xl rounded border border-rose-300 bg-white p-5 shadow-sm">
            <h1 className="text-lg font-semibold text-rose-700">The app hit a runtime error.</h1>
            <p className="mt-2 text-sm text-slate-600">
              Refresh after the latest fix. If this remains, the message below is the useful part.
            </p>
            <pre className="mt-4 overflow-auto rounded bg-slate-950 p-3 text-xs text-white">
              {this.state.error?.message ?? String(this.state.error)}
            </pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
