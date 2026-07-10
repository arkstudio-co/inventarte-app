export type UserRole = 'admin' | 'operative'

export interface Company {
  id: string
  name: string
  slug: string
  logo_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  full_name: string
  email: string
  phone: string | null
  role: UserRole
  company_id: string
  avatar_url: string | null
  created_at: string
  updated_at: string
  companies?: Company | null
}

export interface Permission {
  id: string
  name: string
  description: string
  created_at: string
}

export interface UserPermission {
  id: string
  user_id: string
  permission_id: string
  created_at: string
  permissions?: Permission
}

export interface Supplier {
  id: string
  name: string
  contact: string | null
  email: string | null
  phone: string | null
  company_id: string
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  sku: string
  name: string
  description: string | null
  image_url: string | null
  stock: number
  min_stock: number
  price: number
  cost: number
  gramaje: number | null
  suggested_price: number | null
  supplier_id: string | null
  is_active: boolean
  created_by: string
  company_id: string
  created_at: string
  updated_at: string
  suppliers?: Supplier | null
  abc_classification: 'A' | 'B' | 'C' | null
  last_count_date: string | null
}

export type AdjustmentType = 'positive' | 'negative'
export type AdjustmentReasonCode = 'count' | 'damage' | 'loss' | 'return' | 'found' | 'correction' | 'other'

export interface StockAdjustment {
  id: string
  product_id: string
  adjustment_type: AdjustmentType
  quantity: number
  stock_before: number
  stock_after: number
  reason_code: AdjustmentReasonCode
  reason: string | null
  reference: string | null
  created_by: string
  company_id: string
  created_at: string
  products?: Product | null
}

export interface StockEntry {
  id: string
  product_id: string
  quantity: number
  payment_status: 'paid' | 'pending'
  observations: string | null
  created_by: string
  company_id: string
  created_at: string
}

export interface Seller {
  id: string
  name: string
  email: string | null
  phone: string | null
  notes: string | null
  is_active: boolean
  company_id: string
  created_at: string
  updated_at: string
}

export interface Return {
  id: string
  seller_id: string
  product_id: string
  quantity: number
  observations: string | null
  company_id: string
  created_at: string
  products?: Product | null
}

export interface Payment {
  id: string
  seller_id: string
  amount: number
  payment_method: 'cash' | 'transfer'
  bank_account: string | null
  card_last_four: string | null
  observations: string | null
  company_id: string
  created_at: string
}

export interface StockWithdrawal {
  id: string
  product_id: string
  quantity: number
  person_name: string | null
  person_email: string | null
  delivery_type: 'paid' | 'pending'
  pending_amount: number | null
  observations: string | null
  withdrawal_date: string
  created_by: string
  company_id: string
  created_at: string
  seller_id: string | null
  reason: string
  supplier_id: string | null
  products?: Product | null
  suppliers?: Supplier | null
}

export interface LandingProduct {
  id: string
  product_id: string | null
  title: string | null
  description: string | null
  precio: number | null
  image_url: string | null
  display_order: number
  is_active: boolean
  company_id: string
  created_at: string
  products?: Product | null
}

export interface ContactMessage {
  id: string
  name: string
  email: string
  phone: string | null
  message: string
  is_read: boolean
  company_id: string
  created_at: string
}

export interface CommunityCompany {
  id: string
  name: string
  logo_url: string | null
  display_order: number
  is_active: boolean
  company_id: string
  created_at: string
  updated_at: string
}

export interface Remision {
  id: string
  remision_number: string
  seller_id: string
  person_name: string
  person_email: string | null
  type: 'sale' | 'return' | 'payment'
  delivery_type: 'paid' | 'pending'
  total_amount: number
  notes: string | null
  created_by: string
  company_id: string
  created_at: string
  sellers?: Seller | null
  remision_items?: RemisionItem[]
}

export interface RemisionItem {
  id: string
  remision_id: string
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  subtotal: number
  products?: Product | null
}

export interface AccountPayable {
  id: string
  supplier_id: string | null
  amount: number
  description: string | null
  due_date: string | null
  is_paid: boolean
  company_id: string
  installment_number: number | null
  total_installments: number | null
  installment_group_id: string | null
  created_at: string
  updated_at: string
  suppliers?: Supplier | null
}

export interface AdministrativeExpense {
  id: string
  description: string
  amount: number
  category: string
  type: 'fixed' | 'variable'
  expense_date: string
  notes: string | null
  company_id: string
  last_paid_date: string | null
  created_at: string
  updated_at: string
}

export interface OtherIncome {
  id: string
  amount: number
  description: string
  category: string
  income_date: string
  notes: string | null
  created_by: string
  company_id: string
  created_at: string
}

export type PurchaseOrderStatus = 'draft' | 'sent' | 'partial' | 'received' | 'cancelled'

export interface PurchaseOrder {
  id: string
  order_number: string
  supplier_id: string | null
  status: PurchaseOrderStatus
  total_cost: number
  notes: string | null
  created_by: string
  company_id: string
  created_at: string
  updated_at: string
  suppliers?: Supplier | null
  items?: PurchaseOrderItem[]
}

export interface PurchaseOrderItem {
  id: string
  order_id: string
  product_id: string | null
  product_name: string
  quantity: number
  unit_cost: number
  subtotal: number
  received_quantity: number
  products?: Product | null
}

export interface CompanyInfo {
  id: string
  hero_title: string
  hero_description: string
  hero_image_url: string | null
  about_text: string | null
  email: string
  phone: string
  social_links: Record<string, string> | null
  work_history: string | null
  community_title: string | null
  community_description: string | null
  experience_title: string | null
  experience_description: string | null
  founded_year: number | null
  company_id: string
  created_at: string
  updated_at: string
}
