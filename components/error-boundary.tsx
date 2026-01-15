"use client"

import React from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface ErrorBoundaryProps {
  children: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    // Could integrate with error tracking service here if needed
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-muted/20" role="alert" aria-live="assertive">
          <Card className="max-w-lg w-full border-destructive/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-destructive/10 rounded-lg" aria-hidden="true">
                  <AlertCircle className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <CardTitle>Noe gikk galt</CardTitle>
                  <CardDescription>
                    En uventet feil oppstod. Vi jobber med å fikse det.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                  <p className="text-sm font-mono text-destructive break-all">
                    {this.state.error.toString()}
                  </p>
                  {this.state.error.stack && (
                    <pre className="mt-2 text-xs text-muted-foreground overflow-x-auto">
                      {this.state.error.stack}
                    </pre>
                  )}
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => window.history.back()}
                >
                  Gå tilbake
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Last siden på nytt
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Hvis problemet vedvarer, kontakt oss på{' '}
                <a 
                  href="mailto:sondre@northem.no" 
                  className="text-primary hover:underline"
                >
                  sondre@northem.no
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// Functional component wrapper for easier use
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ReactNode
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary>
        <Component {...props} />
      </ErrorBoundary>
    )
  }
}
