"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { TrendingUp, TrendingDown, DollarSign, Users, Activity, Target } from "lucide-react"

const mockData = [
  { month: "Jan", revenue: 4000, users: 2400, growth: 12 },
  { month: "Feb", revenue: 3000, users: 1398, growth: 8 },
  { month: "Mar", revenue: 2000, users: 9800, growth: 15 },
  { month: "Apr", revenue: 2780, users: 3908, growth: 22 },
  { month: "May", revenue: 1890, users: 4800, growth: 18 },
  { month: "Jun", revenue: 2390, users: 3800, growth: 25 },
]

const mockTableData = [
  { id: 1, name: "AAPL", price: 150.25, change: "+2.5%", volume: "45.2M" },
  { id: 2, name: "MSFT", price: 320.10, change: "-1.2%", volume: "32.1M" },
  { id: 3, name: "GOOGL", price: 2750.00, change: "+0.8%", volume: "18.9M" },
  { id: 4, name: "AMZN", price: 3200.50, change: "+3.1%", volume: "28.7M" },
]

export default function ThemePreview() {
  return (
    <div className="min-h-screen bg-background p-8 space-y-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Theme Preview</h1>
          <p className="text-muted-foreground">Valor-inspired Dark Mode Design System</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="rounded-2xl border border-border bg-card shadow-[0_8px_32px_rgba(0,0,0,0.45)]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Revenue</p>
                  <p className="text-3xl font-bold text-foreground">$45,231</p>
                  <p className="text-sm text-accent flex items-center gap-1 mt-1">
                    <TrendingUp className="h-4 w-4" />
                    +20.1% from last month
                  </p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-border bg-card shadow-[0_8px_32px_rgba(0,0,0,0.45)]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Active Users</p>
                  <p className="text-3xl font-bold text-foreground">2,350</p>
                  <p className="text-sm text-accent flex items-center gap-1 mt-1">
                    <TrendingUp className="h-4 w-4" />
                    +180.1% from last month
                  </p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-border bg-card shadow-[0_8px_32px_rgba(0,0,0,0.45)]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Sales</p>
                  <p className="text-3xl font-bold text-foreground">12,234</p>
                  <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                    <TrendingDown className="h-4 w-4" />
                    +19% from last month
                  </p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <Activity className="h-6 w-6 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-border bg-card shadow-[0_8px_32px_rgba(0,0,0,0.45)]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Conversion</p>
                  <p className="text-3xl font-bold text-foreground">2.6%</p>
                  <p className="text-sm text-accent flex items-center gap-1 mt-1">
                    <TrendingUp className="h-4 w-4" />
                    +0.3% from last month
                  </p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Target className="h-6 w-6 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="rounded-2xl border border-border bg-card shadow-[0_8px_32px_rgba(0,0,0,0.45)]">
            <CardHeader>
              <CardTitle className="text-foreground">Revenue Overview</CardTitle>
              <CardDescription className="text-muted-foreground">Monthly revenue trends</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                                     <AreaChart data={mockData}>
                     <defs>
                       <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor="#8BB9FF" stopOpacity={0.25} />
                         <stop offset="95%" stopColor="#8BB9FF" stopOpacity={0} />
                       </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" stroke="#2B3A57" />
                     <XAxis dataKey="month" tick={{ fill: "#FFFFFF", fontSize: 12 }} axisLine={false} tickLine={false} />
                     <YAxis tick={{ fill: "#FFFFFF", fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                                                         <div className="bg-[#141C2C] border border-[#26324A] rounded-xl p-3 shadow-[0_8px_32px_rgba(0,0,0,0.45)]">
                               <p className="text-sm font-medium text-white">{label}</p>
                               <p className="text-sm text-[#A9B4C7]">
                                 Revenue: ${payload[0].value?.toLocaleString()}
                               </p>
                             </div>
                          )
                        }
                        return null
                      }}
                    />
                                         <Area
                       type="monotone"
                       dataKey="revenue"
                       stroke="#8BB9FF"
                       strokeWidth={2}
                       fill="url(#revenueGradient)"
                     />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-border bg-card shadow-[0_8px_32px_rgba(0,0,0,0.45)]">
            <CardHeader>
              <CardTitle className="text-foreground">User Growth</CardTitle>
              <CardDescription className="text-muted-foreground">Monthly user acquisition</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mockData}>
                                         <CartesianGrid strokeDasharray="3 3" stroke="#2B3A57" />
                     <XAxis dataKey="month" tick={{ fill: "#FFFFFF", fontSize: 12 }} axisLine={false} tickLine={false} />
                     <YAxis tick={{ fill: "#FFFFFF", fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                                                         <div className="bg-[#141C2C] border border-[#26324A] rounded-xl p-3 shadow-[0_8px_32px_rgba(0,0,0,0.45)]">
                               <p className="text-sm font-medium text-white">{label}</p>
                               <p className="text-sm text-[#A9B4C7]">
                                 Users: {payload[0].value?.toLocaleString()}
                               </p>
                             </div>
                          )
                        }
                        return null
                      }}
                    />
                                         <Bar dataKey="users" fill="#4ADE80" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card className="rounded-2xl border border-border bg-card shadow-[0_8px_32px_rgba(0,0,0,0.45)] overflow-hidden">
          <CardHeader className="bg-secondary">
            <CardTitle className="text-foreground">Market Overview</CardTitle>
            <CardDescription className="text-muted-foreground">Top performing stocks</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary">
                  <tr>
                    <th className="text-left p-4 text-xs uppercase tracking-wide text-muted-foreground font-medium">Symbol</th>
                    <th className="text-left p-4 text-xs uppercase tracking-wide text-muted-foreground font-medium">Price</th>
                    <th className="text-left p-4 text-xs uppercase tracking-wide text-muted-foreground font-medium">Change</th>
                    <th className="text-left p-4 text-xs uppercase tracking-wide text-muted-foreground font-medium">Volume</th>
                  </tr>
                </thead>
                <tbody>
                  {mockTableData.map((row, index) => (
                    <tr
                      key={row.id}
                      className={`border-t border-border hover:bg-secondary transition-all ${
                        index === 0 ? "ring-1 ring-accent/20" : ""
                      }`}
                    >
                      <td className="p-4 font-medium text-foreground">{row.name}</td>
                      <td className="p-4 text-foreground">${row.price}</td>
                      <td className="p-4">
                        <Badge
                          variant={row.change.startsWith("+") ? "default" : "destructive"}
                          className="text-xs"
                        >
                          {row.change}
                        </Badge>
                      </td>
                      <td className="p-4 text-muted-foreground">{row.volume}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Form */}
        <Card className="rounded-2xl border border-border bg-card shadow-[0_8px_32px_rgba(0,0,0,0.45)]">
          <CardHeader>
            <CardTitle className="text-foreground">Settings</CardTitle>
            <CardDescription className="text-muted-foreground">Update your preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-foreground">Name</Label>
                <Input
                  id="name"
                  placeholder="Enter your name"
                  className="bg-secondary border-border rounded-xl focus:ring-2 focus:ring-accent/40"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  className="bg-secondary border-border rounded-xl focus:ring-2 focus:ring-accent/40"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button className="bg-accent hover:bg-accent/90 text-white rounded-xl px-4 h-10 shadow">
                Save Changes
              </Button>
              <Button variant="secondary" className="bg-secondary text-foreground hover:bg-secondary/80 rounded-xl px-4 h-10">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
