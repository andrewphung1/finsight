"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function TestColorsPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-app)] p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-4">Color Test Page</h1>
          <p className="text-[var(--text-muted)] mb-8">Testing CSS variables and colors</p>
        </div>

        {/* Text Colors */}
        <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)]">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)]">Text Colors</CardTitle>
            <CardDescription className="text-[var(--text-muted)]">Testing text color variables</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-[var(--text-primary)] text-lg">Primary text color - should be white in dark mode</p>
            <p className="text-[var(--text-muted)] text-lg">Muted text color - should be gray in dark mode</p>
            <p className="text-[var(--accent)] text-lg">Accent color - should be blue</p>
          </CardContent>
        </Card>

        {/* Chart Colors */}
        <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)]">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)]">Chart Colors</CardTitle>
            <CardDescription className="text-[var(--text-muted)]">Testing chart color variables</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-6 rounded-lg bg-[var(--chart-1)] text-white text-center font-semibold">
                Chart Color 1<br/>(Blue)
              </div>
              <div className="p-6 rounded-lg bg-[var(--chart-2)] text-white text-center font-semibold">
                Chart Color 2<br/>(Green)
              </div>
              <div className="p-6 rounded-lg bg-[var(--chart-3)] text-white text-center font-semibold">
                Chart Color 3<br/>(Yellow)
              </div>
              <div className="p-6 rounded-lg bg-[var(--chart-4)] text-white text-center font-semibold">
                Chart Color 4<br/>(Red)
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Background Colors */}
        <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)]">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)]">Background Colors</CardTitle>
            <CardDescription className="text-[var(--text-muted)]">Testing background color variables</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-[var(--bg-app)] border border-[var(--border-subtle)]">
              <p className="text-[var(--text-primary)]">App background color</p>
            </div>
            <div className="p-4 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)]">
              <p className="text-[var(--text-primary)]">Card background color</p>
            </div>
            <div className="p-4 rounded-lg bg-[var(--bg-shell)] border border-[var(--border-subtle)]">
              <p className="text-[var(--text-primary)]">Shell background color</p>
            </div>
          </CardContent>
        </Card>

        {/* Border Colors */}
        <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)]">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)]">Border Colors</CardTitle>
            <CardDescription className="text-[var(--text-muted)]">Testing border color variables</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg border-2 border-[var(--border-subtle)]">
              <p className="text-[var(--text-primary)]">Subtle border color</p>
            </div>
            <div className="p-4 rounded-lg border-2 border-[var(--accent)]">
              <p className="text-[var(--text-primary)]">Accent border color</p>
            </div>
          </CardContent>
        </Card>

        {/* CSS Variable Debug */}
        <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)]">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)]">CSS Variable Debug</CardTitle>
            <CardDescription className="text-[var(--text-muted)]">Current CSS variable values</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[var(--text-muted)] mb-2">Text Colors:</p>
                <p className="text-[var(--text-primary)]">--text-primary: var(--text-primary)</p>
                <p className="text-[var(--text-muted)]">--text-muted: var(--text-muted)</p>
              </div>
              <div>
                <p className="text-[var(--text-muted)] mb-2">Chart Colors:</p>
                <p className="text-[var(--chart-1)]">--chart-1: var(--chart-1)</p>
                <p className="text-[var(--chart-2)]">--chart-2: var(--chart-2)</p>
                <p className="text-[var(--chart-3)]">--chart-3: var(--chart-3)</p>
                <p className="text-[var(--chart-4)]">--chart-4: var(--chart-4)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
