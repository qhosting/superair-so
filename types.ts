
export enum AppRoute {
  DASHBOARD = 'dashboard',
  LEADS = 'leads',
  CLIENTS = 'clients',
  QUOTES = 'quotes',
  PURCHASES = 'purchases',
  SALES = 'sales',
  INVENTORY = 'inventory',
  WAREHOUSES = 'warehouses',
  APPOINTMENTS = 'appointments',
  REPORTS = 'reports',
  MANUAL = 'manual',
  BUILDER = 'builder',
  USERS = 'users',
  SETTINGS = 'settings'
}

// --- AUTH & RBAC ---
export enum UserRole {
  SUPER_ADMIN = 'Super Admin',
  ADMIN = 'Admin',
  INSTALLER = 'Instalador',
  CLIENT = 'Cliente'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'Activo' | 'Inactivo';
  lastLogin?: string;
}

// --- CLIENTS & CRM ---
export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  rfc?: string;
  type: 'Residencial' | 'Comercial';
  status: string;
  notes?: string;
  lastService?: string;
  ltv?: number;
}

/* Fix: Added ClientAsset interface used in Clients.tsx */
export interface ClientAsset {
    id: string;
    brand: string;
    model: string;
    btu: number;
    type: 'MiniSplit' | 'Multisplit' | 'Paquete' | 'VRF';
    install_date?: string;
    last_service?: string;
    notes?: string;
}

// --- QUOTES & SALES ---
export enum PaymentTerms {
  FIFTY_FIFTY = '50% Anticipo / 50% Contra Entrega',
  NET_30 = 'Neto 30 días',
  CASH = 'Contado'
}

/* Fix: Added QuoteItemCategory and QuoteItem interfaces used in Quotes.tsx */
export type QuoteItemCategory = 'Equipos' | 'Materiales' | 'Mano de Obra';

export interface QuoteItem {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    cost: number;
    category: QuoteItemCategory;
}

/* Fix: Added Quote interface used in Dashboard.tsx, Quotes.tsx and PublicQuoteView.tsx */
export interface Quote {
    id: string | number;
    clientId: string | number;
    clientName: string;
    client_name?: string;
    total: number;
    status: string;
    paymentTerms: PaymentTerms | string;
    payment_terms?: string;
    items: QuoteItem[] | string;
    public_token?: string;
    created_at?: string;
    createdAt?: string;
}

export interface OrderItem {
    product_id: string;
    product_name: string;
    quantity: number;
    price: number;
    cost: number;
}

export interface Order {
  id: string | number;
  clientId: string | number;
  clientName: string;
  clientPhone?: string;
  total: number;
  paidAmount: number;
  costTotal: number;
  status: 'Pendiente' | 'Parcial' | 'Completado' | 'Cancelado';
  cfdiStatus: 'Pendiente' | 'Timbrado';
  paymentTerms: string;
  createdAt: string;
  dueDate: string;
  isOverdue: boolean;
  profitMargin: number;
  commission: number;
  evidenceUrl?: string;
  fiscalData?: FiscalData;
  items: OrderItem[];
}

// --- INVENTORY & LOGISTICS ---
export interface Vendor {
  id: string | number;
  name: string;
  rfc?: string;
  email?: string;
  phone?: string;
  credit_days: number;
  current_balance: number;
  status: 'Activo' | 'Suspendido';
}

export interface Product {
  id: string | number;
  code?: string;
  name: string;
  description?: string;
  price: number;
  cost: number;
  stock: number;
  min_stock: number;
  category: string;
  type: 'product' | 'service';
  requires_serial?: boolean;
}

/* Fix: Added Purchase interface used in Purchases.tsx */
export interface Purchase {
    id: string | number;
    vendor_id: string | number;
    vendor_name: string;
    warehouse_id: string | number;
    warehouse_name: string;
    total: number;
    status: 'Borrador' | 'Recibido' | 'Cancelado';
    fiscal_uuid?: string;
    created_at: string;
}

/* Fix: Updated Warehouse interface to include responsible party information */
export interface Warehouse {
  id: string;
  name: string;
  type: string;
  responsible_id?: string | number;
  responsible_name?: string;
}

// --- FISCAL ---
export interface FiscalData {
  uuid: string;
  rfc: string;
  legalName?: string;
  amount: number;
  issuedAt?: string;
  pdfUrl?: string;
  originEmail?: string;
}

// --- LEADS ---
/* Fix: Added LeadStatus and LeadHistoryItem and updated Lead interface used in Leads.tsx */
export type LeadStatus = 'Nuevo' | 'Contactado' | 'Calificado' | 'Cotizado' | 'Ganado' | 'Perdido';

export interface LeadHistoryItem {
    date: string;
    text: string;
    user: string;
}

export interface Lead {
  id: string;
  name: string;
  status: LeadStatus;
  createdAt: string;
  updatedAt?: string;
  phone?: string;
  email?: string;
  notes?: string;
  source: string;
  ai_score?: number;
  ai_analysis?: string;
  history?: LeadHistoryItem[];
}

// --- APPOINTMENTS ---
/* Fix: Expanded Appointment interface to match Appointments.tsx usage */
export interface Appointment {
  id: string;
  client_id: string | number;
  client_name: string;
  date: string;
  time: string;
  duration: number;
  type: string;
  status: string;
  technician: string;
}

// --- CMS ---
/* Fix: Added SectionType, LandingSectionItem and expanded LandingSection used in LandingBuilder.tsx and LandingPage.tsx */
export type SectionType = 'hero' | 'services' | 'cta';

export interface LandingSectionItem {
    title: string;
    desc: string;
    icon?: string;
    image?: string;
    img?: string;
}

export interface LandingSection {
  id: string;
  type: SectionType;
  title: string;
  subtitle: string;
  buttonText?: string;
  imageUrl?: string;
  items?: LandingSectionItem[];
}

// --- MANUAL ---
/* Fix: Updated ManualArticle interface to include category and other missing fields */
export interface ManualArticle {
  id: string;
  title: string;
  content: string;
  updated_at: string;
  category: string;
  tags?: string[];
  pdf_url?: string;
}

// --- NOTIFICATIONS ---
export interface AppNotification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  type: string;
  createdAt: string;
}
