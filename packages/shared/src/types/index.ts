/**
 * Core domain types for the Warehouse Management System
 *
 * This file defines the canonical domain model.
 * All types here must align with the database schema.
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum OrderStatus {
  PENDING = 'PENDING',
  PICKING = 'PICKING',
  PICKED = 'PICKED',
  PACKING = 'PACKING',
  PACKED = 'PACKED',
  SHIPPED = 'SHIPPED',
  CANCELLED = 'CANCELLED',
  BACKORDER = 'BACKORDER'
}

export enum OrderPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export enum OrderItemStatus {
  PENDING = 'PENDING',
  PARTIAL_PICKED = 'PARTIAL_PICKED',
  FULLY_PICKED = 'FULLY_PICKED'
}

export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  SKIPPED = 'SKIPPED'
}

export enum UserRole {
  PICKER = 'PICKER',
  PACKER = 'PACKER',
  STOCK_CONTROLLER = 'STOCK_CONTROLLER',
  INWARDS = 'INWARDS',
  SUPERVISOR = 'SUPERVISOR',
  ADMIN = 'ADMIN',
  PRODUCTION = 'PRODUCTION',
  SALES = 'SALES',
  MAINTENANCE = 'MAINTENANCE',
  RMA = 'RMA'
}

// String literal type for backward compatibility
export type UserRoleValue = 'PICKER' | 'PACKER' | 'STOCK_CONTROLLER' | 'INWARDS' | 'SUPERVISOR' | 'ADMIN' | 'PRODUCTION' | 'SALES' | 'MAINTENANCE' | 'RMA';

export enum BinType {
  SHELF = 'SHELF',
  FLOOR = 'FLOOR',
  RACK = 'RACK',
  BIN = 'BIN'
}

export enum TransactionType {
  RESERVATION = 'RESERVATION',
  DEDUCTION = 'DEDUCTION',
  CANCELLATION = 'CANCELLATION',
  ADJUSTMENT = 'ADJUSTMENT',
  RECEIPT = 'RECEIPT'
}

/**
 * Order Exception Types
 * Categories of issues that can occur during order fulfillment
 */
export enum ExceptionType {
  SHORT_PICK = 'SHORT_PICK',           // Less quantity picked than ordered
  SHORT_PICK_BACKORDER = 'SHORT_PICK_BACKORDER', // Short pick that triggers backorder
  DAMAGE = 'DAMAGE',                   // Item damaged during picking/handling
  DEFECTIVE = 'DEFECTIVE',             // Item found defective (quality issue)
  WRONG_ITEM = 'WRONG_ITEM',           // Wrong item picked
  SUBSTITUTION = 'SUBSTITUTION',       // Item substituted with alternative
  OUT_OF_STOCK = 'OUT_OF_STOCK',       // Item unavailable in inventory
  BIN_MISMATCH = 'BIN_MISMATCH',       // Item not in expected bin location
  BARCODE_MISMATCH = 'BARCODE_MISMATCH', // Scanned barcode doesn't match expected
  EXPIRED = 'EXPIRED',                 // Item past expiration date
  OTHER = 'OTHER'                      // Other exception
}

/**
 * Order Exception Status
 * Lifecycle states for exception handling
 */
export enum ExceptionStatus {
  OPEN = 'OPEN',                       // Exception logged, awaiting resolution
  REVIEWING = 'REVIEWING',             // Under review by supervisor
  APPROVED = 'APPROVED',               // Resolution approved
  REJECTED = 'REJECTED',               // Resolution rejected
  RESOLVED = 'RESOLVED',               // Exception resolved and closed
  CANCELLED = 'CANCELLED'              // Order cancelled due to exception
}

/**
 * Exception Resolution Actions
 * Standard actions for resolving exceptions
 */
export enum ExceptionResolution {
  BACKORDER = 'BACKORDER',             // Place item on backorder
  SUBSTITUTE = 'SUBSTITUTE',           // Substitute with alternative SKU
  CANCEL_ITEM = 'CANCEL_ITEM',         // Cancel line item
  CANCEL_ORDER = 'CANCEL_ORDER',       // Cancel entire order
  ADJUST_QUANTITY = 'ADJUST_QUANTITY', // Adjust ordered quantity
  RETURN_TO_STOCK = 'RETURN_TO_STOCK', // Return damaged item to stock
  WRITE_OFF = 'WRITE_OFF',             // Write off damaged/lost item
  TRANSFER_BIN = 'TRANSFER_BIN',       // Transfer from different bin location
  CONTACT_CUSTOMER = 'CONTACT_CUSTOMER', // Await customer decision
  MANUAL_OVERRIDE = 'MANUAL_OVERRIDE'  // Manual supervisor override
}

// ============================================================================
// DOMAIN ENTITIES
// ============================================================================

/**
 * Order - Container for items a customer has purchased
 *
 * State transitions:
 * PENDING → PICKING → PICKED → PACKING → PACKED → SHIPPED
 *      ↓         ↓
 *  CANCELLED CANCELLED
 */
export interface Order {
  orderId: string;
  customerId: string;
  customerName: string;
  priority: OrderPriority;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
  claimedAt?: Date;
  pickedAt?: Date;
  packedAt?: Date;
  shippedAt?: Date;
  cancelledAt?: Date;
  items?: OrderItem[]; // Optional for queue responses
  pickerId?: string;
  packerId?: string;
  progress: number; // 0-100, calculated server-side
}

/**
 * OrderItem - Line item representing quantity of SKU to fulfill
 *
 * Note: When order is in PICKING status, items are pick tasks and use TaskStatus enum.
 * Otherwise, they use OrderItemStatus enum.
 */
export interface OrderItem {
  orderItemId: string;
  orderId: string;
  sku: string;
  name: string;
  quantity: number;
  pickedQuantity: number;
  verifiedQuantity?: number; // For packing stage - quantity verified by packer
  binLocation: string;
  status: OrderItemStatus | TaskStatus; // Can be either enum depending on order state
  barcode?: string; // EAN/UPC barcode from SKU
  skipReason?: string; // Reason for skipping (only present when status is SKIPPED)
}

/**
 * SKU/Product - Master catalog of sellable items
 */
export interface SKU {
  sku: string;
  name: string;
  description: string;
  image?: string;
  category: string;
  barcode?: string; // EAN/UPC barcode
  binLocations: string[];
  createdAt: Date;
  updatedAt: Date;
  active: boolean;
}

/**
 * InventoryUnit - Physical stock tracking at a specific bin location
 */
export interface InventoryUnit {
  unitId: string;
  sku: string;
  binLocation: string;
  quantity: number;
  reserved: number;
  available: number; // quantity - reserved
  lastUpdated: Date;
}

/**
 * Location (Bin) - Physical warehouse position
 */
export interface BinLocation {
  binId: string;
  zone: string;
  aisle: string;
  shelf: string;
  type: BinType;
  active: boolean;
}

/**
 * PickTask - Atomic unit of work for a picker
 */
export interface PickTask {
  pickTaskId: string;
  orderId: string;
  orderItemId: string;
  sku: string;
  name: string;
  targetBin: string;
  quantity: number;
  pickedQuantity: number;
  status: TaskStatus;
  pickerId?: string;
  startedAt?: Date;
  completedAt?: Date;
  skippedAt?: Date;
  skipReason?: string;
}

/**
 * User - System actors
 */
export interface User {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  activeRole?: UserRole | null; // Active role for multi-role users (e.g., admin acting as picker)
  additionalRoles?: UserRole[]; // Additional roles granted to this user (e.g., picker can also pack)
  currentTaskId?: string;
  createdAt: Date;
  lastLoginAt?: Date;
}

/**
 * InventoryTransaction - Audit trail for all inventory changes
 */
export interface InventoryTransaction {
  transactionId: string;
  type: TransactionType;
  sku: string;
  quantity: number; // positive for addition, negative for deduction
  orderId?: string;
  userId: string;
  timestamp: Date;
  reason: string;
  binLocation?: string;
}

/**
 * OrderStateChange - Audit trail for order status transitions
 */
export interface OrderStateChange {
  changeId: string;
  orderId: string;
  fromStatus: OrderStatus;
  toStatus: OrderStatus;
  userId: string;
  timestamp: Date;
}

/**
 * OrderException - Exception logged during order fulfillment
 */
export interface OrderException {
  exceptionId: string;
  orderId: string;
  orderItemId: string;
  sku: string;
  type: ExceptionType;
  status: ExceptionStatus;
  resolution?: ExceptionResolution;
  quantityExpected: number;
  quantityActual: number;
  quantityShort: number;
  reason: string;
  reportedBy: string;
  reportedAt: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
  resolvedBy?: string;
  resolvedAt?: Date;
  resolutionNotes?: string;
  substituteSku?: string; // For substitutions
}

// ============================================================================
// DTOs (Data Transfer Objects)
// ============================================================================

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface CreateOrderDTO {
  customerId: string;
  customerName: string;
  priority: OrderPriority;
  items: Array<{
    sku: string;
    quantity: number;
  }>;
}

export interface ClaimOrderDTO {
  pickerId: string;
}

export interface PickItemDTO {
  sku: string;
  quantity: number;
  binLocation: string;
  pickTaskId: string;
}

export interface CompleteOrderDTO {
  orderId: string;
  pickerId: string;
}

export interface CancelOrderDTO {
  orderId: string;
  userId: string;
  reason: string;
}

/**
 * Log Exception DTO - Report an exception during picking
 */
export interface LogExceptionDTO {
  orderId: string;
  orderItemId: string;
  sku: string;
  type: ExceptionType;
  quantityExpected: number;
  quantityActual: number;
  reason: string;
  reportedBy: string;
  substituteSku?: string; // For substitution exceptions
}

/**
 * Resolve Exception DTO - Supervisor action to resolve an exception
 */
export interface ResolveExceptionDTO {
  exceptionId: string;
  resolution: ExceptionResolution;
  notes?: string;
  resolvedBy: string;
  // For substitutions
  substituteSku?: string;
  // For quantity adjustments
  newQuantity?: number;
  // For bin transfers
  newBinLocation?: string;
}

// ============================================================================
// API RESPONSES
// ============================================================================

export interface OrderQueueResponse {
  orders: Array<{
    orderId: string;
    customerName: string;
    priority: OrderPriority;
    itemCount: number;
    estimatedPickTime: number; // minutes
  }>;
}

export interface OrderDetailResponse {
  order: Order;
  pickTasks: PickTask[];
}

export interface PickActionResponse {
  success: boolean;
  order: Order;
  pickTask: PickTask;
  message?: string;
}

export interface DashboardMetricsResponse {
  activePickers: number;
  ordersPickedPerHour: number;
  queueDepth: number;
  exceptions: number;
  throughput: {
    today: number;
    week: number;
    month: number;
  };
}

export interface PickerActivity {
  pickerId: string;
  pickerName: string;
  currentOrderId: string | null;
  orderProgress: number;
  currentTask: string | null;
  lastViewedAt: Date | null;
  status: 'ACTIVE' | 'IDLE';
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export class WMSError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'WMSError';
  }
}

export class InventoryError extends WMSError {
  constructor(message: string, details?: unknown) {
    super('INVENTORY_ERROR', 409, message, details);
  }
}

export class ValidationError extends WMSError {
  constructor(message: string, details?: unknown) {
    super('VALIDATION_ERROR', 400, message, details);
  }
}

export class NotFoundError extends WMSError {
  constructor(resource: string, id?: string) {
    super('NOT_FOUND', 404, `${resource}${id ? ` (${id})` : ''} not found`);
  }
}

export class ConflictError extends WMSError {
  constructor(message: string, details?: unknown) {
    super('CONFLICT', 409, message, details);
  }
}

export class UnauthorizedError extends WMSError {
  constructor(message: string = 'Unauthorized') {
    super('UNAUTHORIZED', 401, message);
  }
}

export class ForbiddenError extends WMSError {
  constructor(message: string = 'Forbidden') {
    super('FORBIDDEN', 403, message);
  }
}

// ============================================================================
// ROLE ASSIGNMENT TYPES
// ============================================================================

/**
 * Role Assignment - Represents an additional role granted to a user
 */
export interface RoleAssignment {
  assignmentId: string;
  userId: string;
  role: UserRole;
  grantedBy: string;
  grantedAt: Date;
  active: boolean;
}

/**
 * Grant Role DTO - Request to grant a role to a user
 */
export interface GrantRoleDTO {
  userId: string;
  role: UserRole;
}

/**
 * Revoke Role DTO - Request to revoke a role from a user
 */
export interface RevokeRoleDTO {
  userId: string;
  role: UserRole;
}

// ============================================================================
// INBOUND RECEIVING TYPES
// ============================================================================

/**
 * ASN Status - Advance Shipping Notice lifecycle
 */
export enum ASNStatus {
  PENDING = 'PENDING',
  IN_TRANSIT = 'IN_TRANSIT',
  RECEIVED = 'RECEIVED',
  PARTIALLY_RECEIVED = 'PARTIALLY_RECEIVED',
  CANCELLED = 'CANCELLED'
}

/**
 * Receipt Type - Type of receipt
 */
export enum ReceiptType {
  PO = 'PO',           // Purchase Order
  RETURN = 'RETURN',   // Customer Return
  TRANSFER = 'TRANSFER', // Warehouse Transfer
  ADJUSTMENT = 'ADJUSTMENT' // Inventory Adjustment
}

/**
 * Receipt Status - Receipt lifecycle
 */
export enum ReceiptStatus {
  RECEIVING = 'RECEIVING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

/**
 * Quality Status - Quality check status for received items
 */
export enum QualityStatus {
  PENDING = 'PENDING',
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  PARTIAL = 'PARTIAL'
}

/**
 * Putaway Status - Putaway task lifecycle
 */
export enum PutawayStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

/**
 * ASN Line Status - Receiving status for ASN line items
 */
export enum ASNLineStatus {
  PENDING = 'PENDING',
  PARTIALLY_RECEIVED = 'PARTIALLY_RECEIVED',
  FULLY_RECEIVED = 'FULLY_RECEIVED',
  CANCELLED = 'CANCELLED'
}

/**
 * Advance Shipping Notice (ASN)
 * Expected inbound shipment from supplier
 */
export interface AdvanceShippingNotice {
  asnId: string;
  supplierId: string;
  purchaseOrderNumber: string;
  status: ASNStatus;
  expectedArrivalDate: Date;
  actualArrivalDate?: Date;
  carrier?: string;
  trackingNumber?: string;
  shipmentNotes?: string;
  createdAt: Date;
  updatedAt: Date;
  receivedAt?: Date;
  createdBy: string;
  lineItems?: ASNLineItem[];
}

/**
 * ASN Line Item
 * Individual item expected in an ASN
 */
export interface ASNLineItem {
  lineItemId: string;
  asnId: string;
  sku: string;
  expectedQuantity: number;
  receivedQuantity: number;
  unitCost: number;
  lotNumber?: string;
  expirationDate?: Date;
  receivingStatus: ASNLineStatus;
  lineNotes?: string;
}

/**
 * Receipt
 * Record of goods received from shipment
 */
export interface Receipt {
  receiptId: string;
  asnId?: string;
  receiptDate: Date;
  receiptType: ReceiptType;
  status: ReceiptStatus;
  createdAt: Date;
  completedAt?: Date;
  receivedBy: string;
  lineItems?: ReceiptLineItem[];
}

/**
 * Receipt Line Item
 * Individual item received in a receipt
 */
export interface ReceiptLineItem {
  receiptLineId: string;
  receiptId: string;
  asnLineItemId?: string;
  sku: string;
  quantityOrdered: number;
  quantityReceived: number;
  quantityDamaged: number;
  qualityStatus: QualityStatus;
  putawayStatus: PutawayStatus;
  unitCost?: number;
  totalCost: number;
  lotNumber?: string;
  expirationDate?: Date;
  notes?: string;
}

/**
 * Putaway Task
 * Task to move received goods to storage location
 */
export interface PutawayTask {
  putawayTaskId: string;
  receiptLineId: string;
  sku: string;
  quantityToPutaway: number;
  quantityPutaway: number;
  targetBinLocation: string;
  status: PutawayStatus;
  assignedTo?: string;
  assignedAt?: Date;
  completedAt?: Date;
  completedBy?: string;
  priority: OrderPriority;
  createdAt: Date;
  updatedAt: Date;
  notes?: string;
}

// ============================================================================
// INBOUND RECEIVING DTOs
// ============================================================================

/**
 * Create ASN DTO
 */
export interface CreateASNDTO {
  supplierId: string;
  purchaseOrderNumber: string;
  expectedArrivalDate: Date;
  carrier?: string;
  trackingNumber?: string;
  shipmentNotes?: string;
  createdBy: string;
  lineItems: Array<{
    sku: string;
    expectedQuantity: number;
    unitCost: number;
    lotNumber?: string;
    expirationDate?: Date;
    lineNotes?: string;
  }>;
}

/**
 * Create Receipt DTO
 */
export interface CreateReceiptDTO {
  asnId?: string;
  receiptType: ReceiptType;
  receivedBy: string;
  lineItems: Array<{
    asnLineItemId?: string;
    sku: string;
    quantityOrdered: number;
    quantityReceived: number;
    quantityDamaged: number;
    unitCost?: number;
    lotNumber?: string;
    expirationDate?: Date;
    notes?: string;
  }>;
}

/**
 * Create Putaway Task DTO
 */
export interface CreatePutawayTaskDTO {
  receiptLineId: string;
  quantityToPutaway: number;
  targetBinLocation: string;
  priority: OrderPriority;
  notes?: string;
}

/**
 * Update Putaway Task DTO
 */
export interface UpdatePutawayTaskDTO {
  putawayTaskId: string;
  quantityPutaway: number;
  userId: string;
  status?: PutawayStatus;
}

// ============================================================================
// SHIPPING TYPES
// ============================================================================

/**
 * Shipment Status - Lifecycle states for shipments
 */
export enum ShipmentStatus {
  PENDING = 'PENDING',
  LABEL_CREATED = 'LABEL_CREATED',
  SHIPPED = 'SHIPPED',
  IN_TRANSIT = 'IN_TRANSIT',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  EXCEPTION = 'EXCEPTION',
  CANCELLED = 'CANCELLED'
}

/**
 * Label Format - Format types for shipping labels
 */
export enum LabelFormat {
  PDF = 'PDF',
  PNG = 'PNG',
  ZPLII = 'ZPLII',
  EPL2 = 'EPL2'
}

/**
 * Address interface for shipping
 */
export interface Address {
  name: string;
  company?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
  email?: string;
}

/**
 * Package dimensions
 */
export interface PackageDimensions {
  length: number;
  width: number;
  height: number;
  unit: 'IN' | 'CM';
}

/**
 * Carrier - Shipping carrier company
 */
export interface Carrier {
  carrierId: string;
  name: string;
  carrierCode: string;
  serviceTypes: string[];
  contactEmail?: string;
  contactPhone?: string;
  apiEndpoint?: string;
  isActive: boolean;
  requiresAccountNumber: boolean;
  requiresPackageDimensions: boolean;
  requiresWeight: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Shipment - A shipment for an order
 */
export interface Shipment {
  shipmentId: string;
  orderId: string;
  carrierId?: string;
  serviceType: string;
  shippingMethod: string;
  trackingNumber?: string;
  trackingUrl?: string;
  shipFromAddress: Address;
  shipToAddress: Address;
  totalWeight: number; // in pounds
  totalPackages: number;
  dimensions?: PackageDimensions;
  shippingCost?: number;
  insuranceCost?: number;
  totalCost: number;
  status: ShipmentStatus;
  shipDate?: Date;
  estimatedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  carrierShipmentId?: string;
  carrierResponse?: any;
  createdAt: Date;
  updatedAt: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
  createdBy: string;
  shippedBy?: string;
  labels?: ShippingLabel[];
}

/**
 * Shipping Label - Individual label for packages in a shipment
 */
export interface ShippingLabel {
  labelId: string;
  shipmentId: string;
  labelFormat: LabelFormat;
  labelUrl?: string;
  labelData?: string; // Base64 encoded
  packageNumber: number;
  packageWeight: number;
  packageDimensions?: PackageDimensions;
  carrierTrackingNumber?: string;
  createdAt: Date;
  printedAt?: Date;
  createdBy: string;
}

/**
 * Shipment Tracking Event - Tracking update from carrier
 */
export interface ShipmentTrackingEvent {
  eventId: string;
  shipmentId: string;
  eventCode: string;
  eventDescription: string;
  eventLocation?: string;
  eventDate: Date;
  eventSource: string;
  rawEventData?: any;
}

// ============================================================================
// SHIPPING DTOs
// ============================================================================

/**
 * Create Shipment DTO
 */
export interface CreateShipmentDTO {
  orderId: string;
  carrierId: string;
  serviceType: string;
  shippingMethod: string;
  shipFromAddress: Address;
  shipToAddress: Address;
  totalWeight: number;
  totalPackages: number;
  dimensions?: PackageDimensions;
  insuranceValue?: number;
  shipDate?: Date;
  createdBy: string;
}

/**
 * Create Shipping Label DTO
 */
export interface CreateShippingLabelDTO {
  shipmentId: string;
  packageNumber: number;
  packageWeight: number;
  packageDimensions?: PackageDimensions;
  createdBy: string;
}

/**
 * Add Tracking Event DTO
 */
export interface AddTrackingEventDTO {
  shipmentId: string;
  eventCode: string;
  eventDescription: string;
  eventLocation?: string;
  eventDate: Date;
  eventSource: string;
  rawEventData?: any;
}

// ============================================================================
// CYCLE COUNTING TYPES
// ============================================================================

/**
 * Cycle Count Status - Lifecycle states for cycle counts
 */
export enum CycleCountStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  RECONCILED = 'RECONCILED'
}

/**
 * Cycle Count Type - Different types of cycle counts
 */
export enum CycleCountType {
  ABC = 'ABC',              // ABC analysis based counting (high-value items more frequently)
  BLANKET = 'BLANKET',      // Count all items in a location
  SPOT_CHECK = 'SPOT_CHECK', // Random spot checks
  RECEIVING = 'RECEIVING',    // Count during receiving
  SHIPPING = 'SHIPPING',    // Count during shipping
  AD_HOC = 'AD_HOC'         // Unscheduled counts
}

/**
 * Count Variance Status - Status of variance resolution
 */
export enum VarianceStatus {
  PENDING = 'PENDING',           // Variance detected, awaiting review
  APPROVED = 'APPROVED',         // Adjustment approved
  REJECTED = 'REJECTED',         // Adjustment rejected
  AUTO_ADJUSTED = 'AUTO_ADJUSTED' // Automatically adjusted within tolerance
}

/**
 * Cycle Count Plan - Scheduled cycle count
 */
export interface CycleCountPlan {
  planId: string;
  planName: string;
  countType: CycleCountType;
  status: CycleCountStatus;
  scheduledDate: Date;
  startedAt?: Date;
  completedAt?: Date;
  reconciledAt?: Date;
  location?: string; // Optional: specific location to count
  sku?: string; // Optional: specific SKU to count
  countBy: string; // User who will perform or performed the count
  createdBy: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  countEntries?: CycleCountEntry[];
}

/**
 * Cycle Count Entry - Individual item count result
 */
export interface CycleCountEntry {
  entryId: string;
  planId: string;
  sku: string;
  binLocation: string;
  systemQuantity: number; // Expected quantity from system
  countedQuantity: number; // Actual quantity counted
  variance: number; // Difference (counted - system)
  variancePercent?: number; // Percentage variance
  varianceStatus: VarianceStatus;
  countedAt: Date;
  countedBy: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  adjustmentTransactionId?: string; // Link to inventory transaction if adjusted
  notes?: string;
}

/**
 * Cycle Count Tolerance - Allowed variance thresholds
 */
export interface CycleCountTolerance {
  toleranceId: string;
  toleranceName: string;
  sku?: string; // Optional: SKU-specific tolerance
  abcCategory?: string; // Optional: ABC category (A, B, C)
  locationZone?: string; // Optional: Zone-specific tolerance
  allowableVariancePercent: number;
  allowableVarianceAmount: number;
  autoAdjustThreshold: number; // Variance below this is auto-adjusted
  requiresApprovalThreshold: number; // Variance above this requires approval
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// CYCLE COUNTING DTOs
// ============================================================================

/**
 * Create Cycle Count Plan DTO
 */
export interface CreateCycleCountPlanDTO {
  planName: string;
  countType: CycleCountType;
  scheduledDate: Date;
  location?: string;
  sku?: string;
  countBy: string;
  createdBy: string;
  notes?: string;
}

/**
 * Create Cycle Count Entry DTO
 */
export interface CreateCycleCountEntryDTO {
  planId: string;
  sku: string;
  binLocation: string;
  countedQuantity: number;
  countedBy: string;
  notes?: string;
}

/**
 * Update Variance Status DTO
 */
export interface UpdateVarianceStatusDTO {
  entryId: string;
  status: VarianceStatus;
  reviewedBy: string;
  notes?: string;
}

/**
 * Reconcile Cycle Count DTO
 */
export interface ReconcileCycleCountDTO {
  planId: string;
  reconciledBy: string;
  notes?: string;
}

// ============================================================================
// LOCATION CAPACITY TYPES
// ============================================================================

/**
 * Capacity Type - Type of capacity constraint
 */
export enum CapacityType {
  WEIGHT = 'WEIGHT',
  VOLUME = 'VOLUME',
  QUANTITY = 'QUANTITY'
}

/**
 * Capacity Unit - Units for capacity measurement
 */
export enum CapacityUnit {
  LBS = 'LBS',           // Pounds
  KG = 'KG',             // Kilograms
  CUBIC_FT = 'CUBIC_FT', // Cubic feet
  CUBIC_M = 'CUBIC_M',   // Cubic meters
  UNITS = 'UNITS',       // Individual units
  PALLET = 'PALLET'      // Pallet positions
}

/**
 * Capacity Rule Status - Status of capacity rule
 */
export enum CapacityRuleStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  WARNING = 'WARNING',
  EXCEEDED = 'EXCEEDED'
}

/**
 * Location Capacity - Capacity limits for a bin location
 */
export interface LocationCapacity {
  capacityId: string;
  binLocation: string;
  capacityType: CapacityType;
  maximumCapacity: number;
  currentUtilization: number;
  availableCapacity: number;
  utilizationPercent: number;
  capacityUnit: CapacityUnit;
  status: CapacityRuleStatus;
  warningThreshold: number; // Percentage to trigger warning
  exceededAt?: Date;
  lastUpdated: Date;
  updatedAt: Date;
}

/**
 * Capacity Rule - Business rules for capacity management
 */
export interface CapacityRule {
  ruleId: string;
  ruleName: string;
  description?: string;
  capacityType: CapacityType;
  capacityUnit: CapacityUnit;
  appliesTo: 'ALL' | 'ZONE' | 'LOCATION_TYPE' | 'SPECIFIC_LOCATION';
  zone?: string;
  locationType?: BinType;
  specificLocation?: string;
  maximumCapacity: number;
  warningThreshold: number; // Percentage
  allowOverfill: boolean;
  overfillThreshold?: number; // Maximum overfill percentage
  isActive: boolean;
  priority: number; // Higher priority rules take precedence
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Capacity Alert - Alert when capacity is exceeded or approaching limit
 */
export interface CapacityAlert {
  alertId: string;
  binLocation: string;
  capacityType: CapacityType;
  currentUtilization: number;
  maximumCapacity: number;
  utilizationPercent: number;
  alertType: 'WARNING' | 'EXCEEDED' | 'CRITICAL';
  alertMessage: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  createdAt: Date;
}

// ============================================================================
// LOCATION CAPACITY DTOs
// ============================================================================

/**
 * Create Capacity Rule DTO
 */
export interface CreateCapacityRuleDTO {
  ruleName: string;
  description?: string;
  capacityType: CapacityType;
  capacityUnit: CapacityUnit;
  appliesTo: 'ALL' | 'ZONE' | 'LOCATION_TYPE' | 'SPECIFIC_LOCATION';
  zone?: string;
  locationType?: BinType;
  specificLocation?: string;
  maximumCapacity: number;
  warningThreshold: number;
  allowOverfill: boolean;
  overfillThreshold?: number;
  priority: number;
  createdBy: string;
}

/**
 * Acknowledge Capacity Alert DTO
 */
export interface AcknowledgeCapacityAlertDTO {
  alertId: string;
  acknowledgedBy: string;
}

// ============================================================================
// QUALITY CONTROL TYPES
// ============================================================================

/**
 * Inspection Status - Quality inspection lifecycle
 */
export enum InspectionStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  CONDITIONAL_PASSED = 'CONDITIONAL_PASSED', // Passed with conditions
  CANCELLED = 'CANCELLED'
}

/**
 * Inspection Type - Type of quality inspection
 */
export enum InspectionType {
  INCOMING = 'INCOMING',           // Inspect incoming goods
  OUTGOING = 'OUTGOING',           // Inspect outgoing goods
  INVENTORY = 'INVENTORY',         // Regular inventory inspection
  QUALITY_HOLD = 'QUALITY_HOLD',   // Items placed on quality hold
  RETURN = 'RETURN',               // Returned items inspection
  DAMAGE = 'DAMAGE',               // Damage inspection
  EXPIRATION = 'EXPIRATION',       // Expiration date check
  SPECIAL = 'SPECIAL'              // Special inspection request
}

/**
 * Defect Type - Types of quality defects
 */
export enum DefectType {
  DAMAGED = 'DAMAGED',
  DEFECTIVE = 'DEFECTIVE',
  MISSING_PARTS = 'MISSING_PARTS',
  WRONG_ITEM = 'WRONG_ITEM',
  EXPIRED = 'EXPIRED',
  NEAR_EXPIRY = 'NEAR_EXPIRY',
  MISLABELED = 'MISLABELED',
  PACKAGING = 'PACKAGING',
  CONTAMINATED = 'CONTAMINATED',
  OTHER = 'OTHER'
}

/**
 * Disposition Action - Actions for failed inspections
 */
export enum DispositionAction {
  RETURN_TO_VENDOR = 'RETURN_TO_VENDOR',
  SCRAP = 'SCRAP',
  REWORK = 'REWORK',
  QUARANTINE = 'QUARANTINE',
  SELL_AS_IS = 'SELL_AS_IS',
  DISCOUNT = 'DISCOUNT',
  DONATE = 'DONATE',
  CUSTOMER_RETURN = 'CUSTOMER_RETURN',
  OTHER = 'OTHER'
}

/**
 * Quality Inspection - Quality control inspection record
 */
export interface QualityInspection {
  inspectionId: string;
  inspectionType: InspectionType;
  status: InspectionStatus;
  referenceType: 'ASN' | 'RECEIPT' | 'ORDER' | 'INVENTORY' | 'RETURN';
  referenceId: string;
  sku: string;
  quantityInspected: number;
  quantityPassed: number;
  quantityFailed: number;
  defectType?: DefectType;
  defectDescription?: string;
  dispositionAction?: DispositionAction;
  dispositionNotes?: string;
  inspectorId: string;
  inspectorName: string;
  startedAt?: Date;
  completedAt?: Date;
  location?: string;
  lotNumber?: string;
  expirationDate?: Date;
  images?: string[]; // URLs to inspection photos
  attachments?: string[]; // URLs to additional documents
  approvedBy?: string;
  approvedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Inspection Checklist - Template for inspection criteria
 */
export interface InspectionChecklist {
  checklistId: string;
  checklistName: string;
  description?: string;
  inspectionType: InspectionType;
  sku?: string; // Optional: SKU-specific checklist
  category?: string; // Optional: Category-specific checklist
  isActive: boolean;
  items: InspectionChecklistItem[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Inspection Checklist Item - Individual checklist item
 */
export interface InspectionChecklistItem {
  itemId: string;
  checklistId: string;
  itemDescription: string;
  itemType: 'CHECKBOX' | 'TEXT' | 'NUMBER' | 'PHOTO' | 'PASS_FAIL';
  isRequired: boolean;
  displayOrder: number;
  options?: string[]; // For multiple choice items
}

/**
 * Inspection Result - Results from checklist completion
 */
export interface InspectionResult {
  resultId: string;
  inspectionId: string;
  checklistItemId: string;
  result: string; // The actual result value
  passed: boolean;
  notes?: string;
  imageUrl?: string;
}

/**
 * Return Authorization - Customer return authorization
 */
export interface ReturnAuthorization {
  returnId: string;
  orderId: string;
  customerId: string;
  customerName: string;
  returnReason: string;
  returnDate: Date;
  status: 'PENDING' | 'APPROVED' | 'RECEIVED' | 'INSPECTED' | 'PROCESSED' | 'REJECTED' | 'COMPLETED';
  authorizedBy: string;
  receivedBy?: string;
  inspectedBy?: string;
  totalRefundAmount: number;
  restockingFee?: number;
  notes?: string;
  items?: ReturnItem[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Return Item - Individual item in a return
 */
export interface ReturnItem {
  returnItemId: string;
  returnId: string;
  orderItemId: string;
  sku: string;
  name: string;
  quantity: number;
  returnReason: string;
  condition: 'NEW' | 'OPENED' | 'DAMAGED' | 'DEFECTIVE';
  disposition?: DispositionAction;
  refundAmount: number;
  inspectionId?: string;
}

// ============================================================================
// QUALITY CONTROL DTOs
// ============================================================================

/**
 * Create Inspection DTO
 */
export interface CreateInspectionDTO {
  inspectionType: InspectionType;
  referenceType: 'ASN' | 'RECEIPT' | 'ORDER' | 'INVENTORY' | 'RETURN';
  referenceId: string;
  sku: string;
  quantityInspected: number;
  inspectorId: string;
  location?: string;
  lotNumber?: string;
  expirationDate?: Date;
  checklistId?: string;
  notes?: string;
}

/**
 * Update Inspection Status DTO
 */
export interface UpdateInspectionStatusDTO {
  inspectionId: string;
  status: InspectionStatus;
  quantityPassed?: number;
  quantityFailed?: number;
  defectType?: DefectType;
  defectDescription?: string;
  dispositionAction?: DispositionAction;
  dispositionNotes?: string;
  approvedBy?: string;
  notes?: string;
}

/**
 * Create Return Authorization DTO
 */
export interface CreateReturnAuthorizationDTO {
  orderId: string;
  customerId: string;
  customerName: string;
  returnReason: string;
  items: Array<{
    orderItemId: string;
    sku: string;
    name: string;
    quantity: number;
    returnReason: string;
    condition: 'NEW' | 'OPENED' | 'DAMAGED' | 'DEFECTIVE';
    refundAmount: number;
  }>;
  authorizedBy: string;
  totalRefundAmount: number;
  restockingFee?: number;
}

// ============================================================================
// PHASE 3: ADVANCED FEATURES - EXPORTS
// ============================================================================

// Export all Phase 3 types
export * from './business-rules';
export * from './reporting';
export * from './integrations';

// ============================================================================
// ADD-ON MODULES - EXPORTS
// ============================================================================

// Export all add-on module types
export * from './production';
export * from './sales-crm';
export * from './maintenance';