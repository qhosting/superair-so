
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
  name: string;
  description: string;
  price: number;
  stock: number;
  category: 'Unidad AC' | 'Refacción' | 'Servicio' | 'Insumo' | 'Herramienta';
  btu?: number;
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
  items: { productId: string; quantity: number; price: number }[];
  total: number;
  status: 'Borrador' | 'Enviada' | 'Aceptada' | 'Rechazada';
  paymentTerms: PaymentTerms;
  createdAt: string;
}

export interface FiscalData {
  uuid: string;
  rfc: string;
  legalName?: string;
  xmlUrl?: string;
  pdfUrl?: string;
  issuedAt?: string;
  originEmail?: string; // To track where n8n got it from
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
  type: 'Instalación' | 'Mantenimiento' | 'Reparación';
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
  content: string; // HTML allowed
  variables: string[]; // List of available vars e.g. {{client_name}}
}

export enum AppRoute {
  DASHBOARD = 'dashboard',
  BUILDER = 'builder',
  CLIENTS = 'clients',
  QUOTES = 'quotes',
  SALES = 'sales',
  INVENTORY = 'inventory',
  APPOINTMENTS = 'appointments',
  USERS = 'users',
  SETTINGS = 'settings',
  REPORTS = 'reports'
}

// --- CMS TYPES ---
export type SectionType = 'hero' | 'about' | 'services' | 'history' | 'cta' | 'footer';

export interface LandingSection {
  id: string;
  type: SectionType;
  title: string;
  subtitle: string;
  buttonText?: string;
  imageUrl?: string;
}