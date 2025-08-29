'use client'

import { useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Company page error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-app)] p-4">
      <Card className="w-full max-w-md bg-[var(--bg-card)] border-[var(--border-subtle)] shadow-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-[var(--text-primary)]">Something went wrong!</CardTitle>
          <CardDescription className="text-[var(--text-muted)]">
            Failed to load company information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-[var(--text-muted)] text-center">
            {error.message || 'An unexpected error occurred while loading the company page.'}
          </p>
          <div className="flex gap-2">
            <Button
              onClick={reset}
              className="flex-1 bg-[var(--accent)] hover:bg-[var(--accent)]/90"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try again
            </Button>
            <Button
              onClick={() => window.history.back()}
              variant="outline"
              className="flex-1"
            >
              Go back
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
