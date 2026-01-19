/**
 * Sales & CRM Module Types
 *
 * Basic customer relationship management and sales pipeline functionality
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum CustomerStatus {
  PROSPECT = 'PROSPECT',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  BLOCKED = 'BLOCKED'
}

export enum LeadStatus {
  NEW = 'NEW',
  CONTACTED = 'CONTACTED',
  QUALIFIED = 'QUALIFIED',
  PROPOSAL = 'PROPOSAL',
  NEGOTIATION = 'NEGOTIATION',
  WON = 'WON',
  LOST = 'LOST'
}

export enum LeadPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export enum OpportunityStage {
  PROSPECTING = 'PROSPECTING',
  QUALIFICATION = 'QUALIFICATION',
  PROPOSAL = 'PROPOSAL',
  NEGOTIATION = 'NEGOTIATION',
  CLOSED_WON = 'CLOSED_WON',
  CLOSED_LOST = 'CLOSED_LOST'
}

export enum QuoteStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED'
}

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Customer record
 */
export interface Customer {
  customerId: string;
  customerNumber: string; // Human-readable CUST-XXXXX
  companyName: string;
  contactName?: string;
  email?: string;
  phone?: string;
  billingAddress: Address;
  shippingAddress?: Address;
  status: CustomerStatus;
  taxId?: string;
  paymentTerms?: string;
  creditLimit?: number;
  accountBalance?: number;
  notes?: string;
  assignedTo?: string; // User ID
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
  lastContactDate?: Date;
}

/**
 * Sales lead
 */
export interface Lead {
  leadId: string;
  customerName: string;
  contactName?: string;
  email?: string;
  phone?: string;
  company?: string;
  status: LeadStatus;
  priority: LeadPriority;
  estimatedValue?: number;
  source: string; // Website, Referral, Cold Call, etc.
  description?: string;
  assignedTo: string; // User ID
  expectedCloseDate?: Date;
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
  lastContactDate?: Date;
  nextFollowUpDate?: Date;
}

/**
 * Sales opportunity
 */
export interface Opportunity {
  opportunityId: string;
  opportunityNumber: string; // OPP-XXXXX
  customerId?: string; // Linked to customer if converted
  name: string;
  stage: OpportunityStage;
  amount: number;
  probability: number; // 0-100
  expectedCloseDate: Date;
  description?: string;
  assignedTo: string; // User ID
  source: string;
  competitor?: string;
  lostReason?: string;
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
  closedAt?: Date;
  closedBy?: string;
}

/**
 * Sales quote
 */
export interface Quote {
  quoteId: string;
  quoteNumber: string; // QT-XXXXX
  customerId: string;
  opportunityId?: string;
  status: QuoteStatus;
  validUntil: Date;
  lineItems: QuoteLineItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  notes?: string;
  termsAndConditions?: string;
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
  sentAt?: Date;
  acceptedAt?: Date;
  rejectedAt?: Date;
  convertedToOrderId?: string;
}

/**
 * Quote line item
 */
export interface QuoteLineItem {
  lineItemId: string;
  quoteId: string;
  sku: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  lineNumber: number;
  total: number;
}

/**
 * Customer interaction log
 */
export interface CustomerInteraction {
  interactionId: string;
  customerId?: string;
  leadId?: string;
  opportunityId?: string;
  interactionType: 'CALL' | 'EMAIL' | 'MEETING' | 'NOTE' | 'OTHER';
  subject: string;
  notes: string;
  durationMinutes?: number;
  nextFollowUpDate?: Date;
  createdAt: Date;
  createdBy: string;
}

/**
 * Address type
 */
export interface Address {
  street1: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

export interface CreateCustomerDTO {
  companyName: string;
  contactName?: string;
  email?: string;
  phone?: string;
  billingAddress: Address;
  shippingAddress?: Address;
  taxId?: string;
  paymentTerms?: string;
  creditLimit?: number;
  notes?: string;
  assignedTo?: string;
}

export interface CreateLeadDTO {
  customerName: string;
  contactName?: string;
  email?: string;
  phone?: string;
  company?: string;
  source: string;
  estimatedValue?: number;
  description?: string;
  assignedTo: string;
  expectedCloseDate?: string;
}

export interface CreateOpportunityDTO {
  customerId?: string;
  name: string;
  amount: number;
  expectedCloseDate: string;
  stage: OpportunityStage;
  probability?: number;
  source: string;
  description?: string;
  assignedTo: string;
}

export interface CreateQuoteDTO {
  customerId: string;
  opportunityId?: string;
  validUntil: string;
  lineItems: Omit<QuoteLineItem, 'lineItemId' | 'quoteId' | 'total'>[];
  notes?: string;
  termsAndConditions?: string;
}
