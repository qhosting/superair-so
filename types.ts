
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

export type QuoteItemCategory = 'Equipos' | 'Materiales' | 'Mano de Obra';

export interface QuoteItem {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    cost: number;
    category: QuoteItemCategory;
}

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
export type UnitOfMeasure = 'Pza' | 'Kg' | 'Mts' | 'Lto' | 'Jgo';

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
  unit_of_measure: UnitOfMeasure;
  requires_serial?: boolean;
}

export interface InventoryKitItem {
    product_id: string | number;
    product_name?: string;
    quantity: number;
}

export interface InventoryKit {
    id: string | number;
    name: string;
    description: string;
    items: InventoryKitItem[];
}

export interface InventoryTransfer {
    id: string | number;
    from_warehouse_id: string | number;
    to_warehouse_id: string | number;
    from_name?: string;
    to_name?: string;
    status: 'Pendiente' | 'Completado' | 'Cancelado';
    created_at: string;
    items: any[];
}

export interface Warehouse {
  id: string;
  name: string;
  type: string;
  responsible_id?: string | number;
  responsible_name?: string;
}

// --- PURCHASES & VENDORS ---
export interface Vendor {
  id: string | number;
  name: string;
  rfc?: string;
  phone?: string;
  email?: string;
  status: 'Activo' | 'Inactivo';
  credit_days: number;
  current_balance: number;
}

export interface Purchase {
  id: string | number;
  vendor_id: string | number;
  vendor_name?: string;
  warehouse_id: string | number;
  warehouse_name?: string;
  total: number;
  status: 'Borrador' | 'Recibido' | 'Cancelado';
  fiscal_uuid?: string;
  items: any[];
  created_at?: string;
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
export interface Appointment {
  id: string | number;
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
export interface ManualArticle {
  id: string;
  title: string;
  content: string;
  updated_at: string;
  category: string;
  version: string;
  author_name?: string;
  tags?: string[];
  pdf_url?: string;
  is_read?: boolean; // Virtual property based on user interaction
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
