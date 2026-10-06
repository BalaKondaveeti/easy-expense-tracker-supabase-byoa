export type Card = {
  id: string
  name: string
  default_cashback_pct: number
  archived: boolean
}

export type Category = {
  id: string
  name: string
  emoji: string
  color: string
  archived: boolean
}

export type Mood = Category

export type Payee = {
  id: string
  name: string
  kind: string
  emoji: string
  color: string
  default_amount: number | null
  currency: string
  archived: boolean
}

export type Expense = {
  id: string
  title: string
  amount: number
  currency: string
  spent_on: string
  card_id: string | null
  cashback_pct: number
  category_id: string | null
  mood_id: string | null
  note: string | null
}

export type BillPayment = {
  id: string
  payee_id: string
  amount: number
  currency: string
  paid_on: string
  card_id: string | null
  note: string | null
}

export type Lists = {
  cards: Card[]
  categories: Category[]
  moods: Mood[]
  payees: Payee[]
}

export const PAYEE_KINDS = ['EMI', 'Card payment', 'Loan', 'Rent', 'Utilities', 'Remittance', 'Subscription', 'Other']
