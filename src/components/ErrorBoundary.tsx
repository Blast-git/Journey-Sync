import React from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error?: Error }> {
  state = { hasError: false, error: undefined };

  static getDerivedStateFromError(error: Error) {
    // Update state to trigger fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error to the console (can be extended to a service like Sentry)
    console.error("Error caught by Error Boundary:", error, errorInfo);
  }

  resetError = () => {
    // Reset the error state to re-render the child components
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Alert variant="destructive" className="max-w-md w-full">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              <p className="text-foreground mb-2">
                We're sorry, but an error occurred while loading this page. Please try again.
              </p>
              {this.state.error && (
                <p className="text-sm text-muted-foreground">
                  Error: {this.state.error.message}
                </p>
              )}
              <Button
                onClick={this.resetError}
                className="mt-4"
                variant="default"
              >
                Try Again
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;