import { NextResponse } from 'next/server'
import { loadTickerPriceData } from '@/lib/ticker-price-loader'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { searchParams } = new URL(req.url)
  const start = searchParams.get('start') ?? '2018-01-01'
  const end = searchParams.get('end') ?? new Date().toISOString().slice(0,10)

  const resolvedParams = await params
  const data = await loadTickerPriceData(resolvedParams.symbol, start, end)
  return NextResponse.json({ prices: data })
}
