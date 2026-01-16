
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
  passwordLastChanged?: string;
}

export interface AuditLog {
    id: string;
    user_id: string;
    user_name: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'IMPERSONATE';
    resource: string;
    resource_id: string;
    changes?: {
        field: string;
        old: any;
        new: any;
    }[];
    ip_address: string;
    created_at: string;
}

export interface SecurityHealth {
    score: number;
    issues: {
        severity: 'low' | 'medium' | 'high';
        title: string;
        description: string;
    }[];
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

export interface FiscalData {
    uuid: string;
    rfc: string;
    legalName: string;
    amount: number;
    date: string;
    xmlUrl?: string;
}

export interface Order {
  id: string | number;
  clientId: string | number;
  clientName: string;
  clientPhone?: string;
  total: number;
  paidAmount: number;
  costTotal: number;
  cost_total?: number;
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

export interface Warehouse {
    id: string | number;
    name: string;
    type: 'Central' | 'Unidad Móvil';
    responsible_id?: string | number;
    responsible_name?: string;
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

// --- LEADS & CRM ---
export type LeadStatus = 'Nuevo' | 'Contactado' | 'Calificado' | 'Cotizado' | 'Ganado' | 'Perdido';

export interface LeadHistoryItem {
    date: string;
    text: string;
    user: string;
}

export interface Lead {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    source: string;
    status: LeadStatus;
    notes?: string;
    createdAt: string;
    updatedAt?: string;
    ai_score?: number;
    ai_analysis?: string;
    history: LeadHistoryItem[];
}

// --- APPOINTMENTS ---
export interface Appointment {
    id: string | number;
    client_id: string | number;
    client_name?: string;
    technician: string;
    date: string;
    time: string;
    duration: number;
    type: string;
    status: 'Programada' | 'En Proceso' | 'Completada' | 'Cancelado';
}

// --- LANDING BUILDER ---
export type SectionType = 'hero' | 'services' | 'cta';

export interface LandingItem {
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
    items?: LandingItem[];
}

// --- PURCHASES & VENDORS ---
export interface Vendor {
    id: string | number;
    name: string;
    rfc?: string;
    email?: string;
    phone?: string;
    credit_days: number;
    current_balance?: number;
    status: 'Activo' | 'Inactivo';
}

export interface PurchaseItem {
    product_id: string | number;
    product_name?: string;
    quantity: number;
    cost: number;
    serials?: string[];
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
    created_at?: string;
    items?: PurchaseItem[];
}

// --- NOTIFICATIONS ---
export interface AppNotification {
    id: string | number;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    isRead: boolean;
    createdAt: string;
}

// --- KNOWLEDGE BASE ---
export interface ManualArticle {
    id: string;
    title: string;
    category: 'Instalación' | 'Mantenimiento' | 'Seguridad' | 'Administrativo';
    content: string;
    tags: string[];
    pdf_url?: string;
    version: string;
    author_name?: string;
    updated_at: string;
    is_read?: boolean;
}
