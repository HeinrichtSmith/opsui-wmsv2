/**
 * Routes index
 *
 * Exports all route modules
 */

import { Router } from 'express';
import authRoutes from './auth';
import orderRoutes from './orders';
import inventoryRoutes from './inventory';
import metricsRoutes from './metrics';
import skuRoutes from './skus';
import healthRoutes from './health';
import stockControlRoutes from './stockControl';
import exceptionRoutes from './exceptions';
import inboundRoutes from './inbound';
import shippingRoutes from './shipping';
import cycleCountRoutes from './cycleCount';
import locationCapacityRoutes from './locationCapacity';
import qualityControlRoutes from './qualityControl';
import businessRulesRoutes from './businessRules';
import reportsRoutes from './reports';
import integrationsRoutes from './integrations';
import productionRoutes from './production';
import salesRoutes from './sales';
import maintenanceRoutes from './maintenance';
import roleAssignmentRoutes from './roleAssignments';
import userRoutes from './users';

const router = Router();

// Health check routes (no auth required)
router.use('/health', healthRoutes);

// API v1 routes (require auth)
const v1Router = Router();
v1Router.use('/auth', authRoutes);
v1Router.use('/orders', orderRoutes);
v1Router.use('/inventory', inventoryRoutes);
v1Router.use('/metrics', metricsRoutes);
v1Router.use('/skus', skuRoutes);
v1Router.use('/stock-control', stockControlRoutes);
v1Router.use('/exceptions', exceptionRoutes);
v1Router.use('/inbound', inboundRoutes);
v1Router.use('/shipping', shippingRoutes);
v1Router.use('/cycle-count', cycleCountRoutes);
v1Router.use('/location-capacity', locationCapacityRoutes);
v1Router.use('/quality-control', qualityControlRoutes);
v1Router.use('/business-rules', businessRulesRoutes);
v1Router.use('/reports', reportsRoutes);
v1Router.use('/integrations', integrationsRoutes);
v1Router.use('/production', productionRoutes);
v1Router.use('/sales', salesRoutes);
v1Router.use('/maintenance', maintenanceRoutes);
v1Router.use('/role-assignments', roleAssignmentRoutes);
v1Router.use('/users', userRoutes);

// Mount API v1
router.use('/v1', v1Router);

// Legacy routes (for backward compatibility)
router.use('/auth', authRoutes);
router.use('/orders', orderRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/metrics', metricsRoutes);
router.use('/skus', skuRoutes);
router.use('/stock-control', stockControlRoutes);
router.use('/exceptions', exceptionRoutes);
router.use('/inbound', inboundRoutes);
router.use('/shipping', shippingRoutes);
router.use('/cycle-count', cycleCountRoutes);
router.use('/location-capacity', locationCapacityRoutes);
router.use('/quality-control', qualityControlRoutes);
router.use('/business-rules', businessRulesRoutes);
router.use('/reports', reportsRoutes);
router.use('/integrations', integrationsRoutes);
router.use('/production', productionRoutes);
router.use('/sales', salesRoutes);
router.use('/maintenance', maintenanceRoutes);
router.use('/role-assignments', roleAssignmentRoutes);
router.use('/users', userRoutes);

export default router;