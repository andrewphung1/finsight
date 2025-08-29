import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Search, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-app)] p-4">
      <Card className="w-full max-w-md bg-[var(--bg-card)] border-[var(--border-subtle)] shadow-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
            <Search className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-[var(--text-primary)]">Company not found</CardTitle>
          <CardDescription className="text-[var(--text-muted)]">
            The company you're looking for doesn't exist
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-[var(--text-muted)] text-center">
            The company symbol or page you're trying to access could not be found. 
            Please check the URL or search for a different company.
          </p>
          <div className="flex gap-2">
            <Link href="/" className="flex-1">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go home
              </Button>
            </Link>
            <Link href="/search" className="flex-1">
              <Button className="w-full bg-[var(--accent)] hover:bg-[var(--accent)]/90">
                <Search className="h-4 w-4 mr-2" />
                Search companies
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
