import Papa from "papaparse"
import { format, isValid, parseISO } from "date-fns"
import type { TradingTransaction, ParsedCSVRow, CSVParseResult } from "@/types/trading"

export function parseCSVFile(file: File, userId: string): Promise<CSVParseResult> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parseResult = validateAndTransformData(results.data as ParsedCSVRow[], userId)
        resolve(parseResult)
      },
      error: (error) => {
        resolve({
          success: false,
          data: [],
          errors: [`Failed to parse CSV: ${error.message}`],
          totalRows: 0,
        })
      },
    })
  })
}

function validateAndTransformData(rows: ParsedCSVRow[], userId: string): CSVParseResult {
  const errors: string[] = []
  const validTransactions: TradingTransaction[] = []

  rows.forEach((row, index) => {
    const rowNumber = index + 1
    const validation = validateRow(row, rowNumber)

    if (validation.isValid && validation.transaction) {
      validTransactions.push({
        ...validation.transaction,
        userId,
        id: `${userId}-${validation.transaction.ticker}-${validation.transaction.date}-${Date.now()}-${index}`,
      })
    } else {
      errors.push(...validation.errors)
    }
  })

  return {
    success: errors.length === 0,
    data: validTransactions,
    errors,
    totalRows: rows.length,
  }
}

function validateRow(
  row: ParsedCSVRow,
  rowNumber: number,
): {
  isValid: boolean
  transaction?: Omit<TradingTransaction, "id" | "userId">
  errors: string[]
} {
  const errors: string[] = []

  // Check required fields
  if (!row.ticker?.trim()) {
    errors.push(`Row ${rowNumber}: Missing ticker symbol`)
  }

  if (!row.date?.trim()) {
    errors.push(`Row ${rowNumber}: Missing date`)
  }

  if (!row.quantity?.trim()) {
    errors.push(`Row ${rowNumber}: Missing quantity`)
  }

  if (!row.price?.trim()) {
    errors.push(`Row ${rowNumber}: Missing price`)
  }

  if (!row.type?.trim()) {
    errors.push(`Row ${rowNumber}: Missing transaction type`)
  }

  // If any required field is missing, return early
  if (errors.length > 0) {
    return { isValid: false, errors }
  }

  // Validate ticker (should be uppercase letters, 1-5 characters)
  const ticker = row.ticker.trim().toUpperCase()
  if (!/^[A-Z]{1,5}$/.test(ticker)) {
    errors.push(`Row ${rowNumber}: Invalid ticker format "${row.ticker}". Expected 1-5 uppercase letters.`)
  }

  // Validate date
  let parsedDate: Date
  try {
    parsedDate = parseISO(row.date.trim())
    if (!isValid(parsedDate)) {
      errors.push(`Row ${rowNumber}: Invalid date format "${row.date}". Expected YYYY-MM-DD.`)
    }
  } catch {
    errors.push(`Row ${rowNumber}: Invalid date format "${row.date}". Expected YYYY-MM-DD.`)
  }

  // Validate quantity
  const quantity = Number.parseFloat(row.quantity.trim())
  if (isNaN(quantity) || quantity <= 0) {
    errors.push(`Row ${rowNumber}: Invalid quantity "${row.quantity}". Must be a positive number.`)
  }

  // Validate price
  const price = Number.parseFloat(row.price.trim())
  if (isNaN(price) || price <= 0) {
    errors.push(`Row ${rowNumber}: Invalid price "${row.price}". Must be a positive number.`)
  }

  // Validate transaction type
  const type = row.type.trim().toUpperCase()
  if (!["BUY", "SELL"].includes(type)) {
    errors.push(`Row ${rowNumber}: Invalid transaction type "${row.type}". Must be "BUY" or "SELL".`)
  }

  if (errors.length > 0) {
    return { isValid: false, errors }
  }

  return {
    isValid: true,
    transaction: {
      ticker,
      date: format(parsedDate!, "yyyy-MM-dd"),
      quantity,
      price,
      type: type as "BUY" | "SELL",
    },
    errors: [],
  }
}
