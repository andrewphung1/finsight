"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface ChartFrameProps {
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
}

export function ChartFrame({ title, children, footer }: ChartFrameProps) {
  return (
    <Card className="h-[260px]">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0 h-[170px]">
        {children}
      </CardContent>
      {footer && (
        <div className="px-4 pb-3">
          {footer}
        </div>
      )}
    </Card>
  )
}

interface MetricBarChartProps {
  data: Array<{ date: string; [key: string]: any }>
  dataKey: string
  formatter: (value: number) => string
  xLabelFormatter?: (value: string) => string
  color?: string
}

export function MetricBarChart({ 
  data, 
  dataKey, 
  formatter, 
  xLabelFormatter = (value) => value,
  color = "hsl(var(--chart-1))"
}: MetricBarChartProps) {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const value = payload[0].value
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{xLabelFormatter(label)}</p>
          <p className="text-sm text-muted-foreground">
            {formatter(value)}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 16, right: 22, left: 22, bottom: 14 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-color)" strokeOpacity={0.6} />
        <XAxis 
          dataKey="date" 
          tick={{ fontSize: 10 }}
          tickFormatter={xLabelFormatter}
          stroke="hsl(var(--muted-foreground))"
          interval="preserveStartEnd"
          minTickGap={20}
          angle={-45}
          textAnchor="end"
          height={60}
        />
        <YAxis 
          tick={{ fontSize: 10 }}
          tickFormatter={formatter}
          stroke="hsl(var(--muted-foreground))"
          width={60}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar 
          dataKey={dataKey} 
          fill={color}
          animationDuration={0}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
