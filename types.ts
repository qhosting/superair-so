
export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  rfc?: string;
  type: 'Residencial' | 'Comercial';
  status: 'Prospecto' | 'Activo' | 'Inactivo';
  notes?: string;
  totalSpent?: number;
  lastService?: string;
}

export interface Product {
  id: string;
  code?: string;
  name: string;
  description: string;
  price: number;
  cost?: number;
  price_wholesale?: number;
  price_vip?: number;
  stock: number; // Aggregate stock
  category: 'Unidad AC' | 'Refacción' | 'Servicio' | 'Insumo' | 'Herramienta';
  type?: 'product' | 'service'; 
  btu?: number;
  min_stock?: number;
  location?: string;
  duration?: number;
  requires_serial?: boolean; // New: To track serial numbers
}

export interface Vendor {
  id: string;
  name: string;
  rfc: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  credit_days?: number;
}

export interface Warehouse {
  id: string;
  name: string;
  type: 'Central' | 'Unidad Móvil' | 'Garantías';
  responsible_id?: string; // Links to a User (Installer)
}

export interface Purchase {
  id: string;
  vendor_id: string;
  vendor_name?: string;
  warehouse_id?: string;
  warehouse_name?: string;
  total: number;
  status: 'Borrador' | 'Pendiente' | 'Recibido' | 'Cancelado';
  items: { product_id: string; product_name?: string; quantity: number; cost: number; serials?: string[] }[];
  created_at: string;
}

export enum PaymentTerms {
  FULL_PAYMENT = '100% Contado',
  FIFTY_FIFTY = '50% Anticipo / 50% Entrega',
  THIRTY_SEVENTY = '30% Anticipo / 70% Entrega',
  CREDIT_30 = 'Crédito 30 días'
}

export interface Quote {
  id: string;
  clientId: string;
  clientName?: string;
  items: { productId: string; productName?: string; quantity: number; price: number }[];
  total: number;
  status: 'Borrador' | 'Enviada' | 'Aceptada' | 'Rechazada';
  paymentTerms: PaymentTerms;
  createdAt: string;
}

export interface FiscalData {
  uuid: string;
  rfc: string;
  legalName?: string;
  originEmail?: string;
  amount: number;
  issuedAt: string;
  pdfUrl?: string;
}

export interface Order {
  id: string;
  quoteId: string;
  clientName: string;
  total: number;
  paidAmount: number;
  status: 'Pendiente' | 'Instalando' | 'Completado' | 'Cancelado';
  installationDate?: string;
  cfdiStatus?: 'Pendiente' | 'Timbrado' | 'Error';
  fiscalData?: FiscalData;
}

export interface Appointment {
  id: string;
  clientId: string;
  client_name?: string;
  technician: string;
  date: string;
  time: string;
  duration?: number; 
  type: 'Instalación' | 'Mantenimiento' | 'Reparación' | 'Visita Técnica';
  status: 'Programada' | 'En Proceso' | 'Completada' | 'Cancelada';
}

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
  lastLogin: string;
}

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
  source: 'Facebook' | 'Google' | 'Instagram' | 'Manual' | 'Web' | string;
  campaign?: string; 
  status: LeadStatus;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  ai_score?: number;      // 1-10
  ai_analysis?: string;   // Resumen de IA
  history?: LeadHistoryItem[]; // Bitácora
}

export interface AppNotification {
  id: number;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  isRead: boolean;
  createdAt: string;
}

export interface ManualArticle {
  id: string;
  category: 'Instalación' | 'Mantenimiento' | 'Seguridad' | 'Administrativo';
  title: string;
  content: string;
  tags?: string[];
  pdf_url?: string;
  updated_at: string;
}

export enum AppRoute {
  DASHBOARD = 'dashboard',
  BUILDER = 'builder',
  LEADS = 'leads', 
  CLIENTS = 'clients',
  QUOTES = 'quotes',
  SALES = 'sales',
  PURCHASES = 'purchases',
  INVENTORY = 'inventory',
  WAREHOUSES = 'warehouses',
  APPOINTMENTS = 'appointments',
  REPORTS = 'reports',
  MANUAL = 'manual',
  USERS = 'users',
  SETTINGS = 'settings'
}

export type SectionType = 'hero' | 'about' | 'services' | 'history' | 'cta' | 'footer';

export interface LandingSection {
  id: string;
  type: SectionType;
  title: string;
  subtitle: string;
  buttonText?: string;
  imageUrl?: string;
  items?: any[]; 
}
