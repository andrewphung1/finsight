"use client"

import { Dashboard } from "@/components/dashboard"
// import { AuthPage } from "@/components/auth/auth-page"
// import { useAuth } from "@/contexts/auth-context"
// import { Loader2 } from 'lucide-react'

export default function Home() {
  // const { user, loading } = useAuth()

  // if (loading) {
  //   return (
  //     <div className="min-h-screen flex items-center justify-center bg-background">
  //       <Loader2 className="h-8 w-8 animate-spin" />
  //     </div>
  //   )
  // }

  // return <main className="min-h-screen bg-background">{user ? <Dashboard /> : <AuthPage />}</main>

  return (
    <main className="min-h-screen bg-background">
      <Dashboard />
    </main>
  )
}
