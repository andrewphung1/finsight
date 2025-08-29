export interface Profile {
  id: string
  email: string
  full_name: string | null
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  user_id: string
  ticker: string
  transaction_date: string
  quantity: number
  price: number
  transaction_type: "buy" | "sell"
  total_value: number
  created_at: string
  updated_at: string
}

export interface PortfolioSnapshot {
  id: string
  user_id: string
  snapshot_date: string
  total_value: number
  total_cost_basis: number
  total_return: number
  return_percentage: number
  holdings: Record<string, any>
  created_at: string
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, "id" | "created_at" | "updated_at">
        Update: Partial<Omit<Profile, "id" | "created_at" | "updated_at">>
      }
      transactions: {
        Row: Transaction
        Insert: Omit<Transaction, "id" | "total_value" | "created_at" | "updated_at">
        Update: Partial<Omit<Transaction, "id" | "total_value" | "created_at" | "updated_at">>
      }
      portfolio_snapshots: {
        Row: PortfolioSnapshot
        Insert: Omit<PortfolioSnapshot, "id" | "created_at">
        Update: Partial<Omit<PortfolioSnapshot, "id" | "created_at">>
      }
    }
  }
}
