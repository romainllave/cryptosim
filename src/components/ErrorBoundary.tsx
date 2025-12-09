import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="p-8 max-w-2xl mx-auto mt-20 bg-red-50 border border-red-200 rounded-lg shadow-lg">
                    <h1 className="text-2xl font-bold text-red-700 mb-4">Something went wrong</h1>
                    <p className="text-red-600 mb-4">The application crashed. Here is the error:</p>
                    <div className="bg-white p-4 rounded border border-red-200 overflow-auto text-sm font-mono text-red-800">
                        {this.state.error?.toString()}
                        <br />
                        <pre>{this.state.error?.stack}</pre>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-6 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    >
                        Reload Page
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
