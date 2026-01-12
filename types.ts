
export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  rfc?: string; // Nuevo campo fiscal
  type: 'Residencial' | 'Comercial';
  status: 'Prospecto' | 'Activo' | 'Inactivo';
  notes?: string;
  totalSpent?: number;
  lastService?: string;
}

export interface Product {
  id: string;
  code?: string; // SKU / Código Interno
  name: string;
  description: string;
  price: number; // Precio Público Base (Precio de Lista)
  cost?: number; // Costo Unitario
  price_wholesale?: number; // Precio Mayoreo
  price_vip?: number; // Precio VIP/Distribuidor
  stock: number;
  category: 'Unidad AC' | 'Refacción' | 'Servicio' | 'Insumo' | 'Herramienta';
  type?: 'product' | 'service'; 
  btu?: number;
  min_stock?: number;
  location?: string; // Ubicación en almacén (Ej: Pasillo A-1)
  duration?: number; // Duración estimada en minutos (Solo servicios)
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
  amount?: number;
  xmlUrl?: string;
  pdfUrl?: string;
  issuedAt?: string;
  originEmail?: string; 
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

export interface Template {
  id: string;
  code: 'email_quote' | 'email_invoice' | 'pdf_quote_layout';
  name: string;
  subject?: string;
  content: string; 
  variables: string[]; 
}

export type LeadStatus = 'Nuevo' | 'Contactado' | 'Calificado' | 'Cotizado' | 'Ganado' | 'Perdido';

export interface Lead {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  source: 'Facebook' | 'Google' | 'Instagram' | 'Manual' | 'Web';
  campaign?: string; 
  status: LeadStatus;
  notes?: string;
  createdAt: string;
}

export interface AppNotification {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  createdAt: string;
}

export enum AppRoute {
  DASHBOARD = 'dashboard',
  BUILDER = 'builder',
  LEADS = 'leads', 
  CLIENTS = 'clients',
  QUOTES = 'quotes',
  SALES = 'sales',
  INVENTORY = 'inventory',
  APPOINTMENTS = 'appointments',
  USERS = 'users',
  SETTINGS = 'settings',
  REPORTS = 'reports'
}

export type SectionType = 'hero' | 'about' | 'services' | 'history' | 'cta' | 'footer';

export interface LandingItem {
  title: string;
  desc: string;
  icon?: string; 
  image?: string;
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
