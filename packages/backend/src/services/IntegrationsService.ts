/**
 * Integrations Service
 *
 * Business logic for managing external system integrations (ERP, e-commerce, carriers)
 * Handles sync jobs, webhook processing, and carrier account management
 */

import { IntegrationsRepository } from '../repositories/IntegrationsRepository';
import {
  Integration,
  IntegrationType,
  IntegrationProvider,
  IntegrationStatus,
  SyncJob,
  SyncJobType,
  SyncJobStatus,
  WebhookEvent,
  WebhookEventType,
  WebhookEventStatus,
  CarrierAccount,
  CarrierProvider,
} from '@opsui/shared';

// ============================================================================
// SERVICE
// ============================================================================

export class IntegrationsService {
  constructor(private repository: IntegrationsRepository) {}

  // ========================================================================
  // INTEGRATION MANAGEMENT
  // ========================================================================

  async createIntegration(
    integration: Omit<Integration, 'integrationId' | 'createdAt' | 'updatedAt'>
  ): Promise<Integration> {
    // Validate configuration based on provider
    this.validateConfiguration(integration.provider, integration.configuration);

    // For carrier integrations, require webhook settings for shipment updates
    if (integration.type === IntegrationType.CARRIER && !integration.webhookSettings) {
      throw new Error('Carrier integrations require webhook settings for shipment updates');
    }

    const created = await this.repository.create(integration);

    // Create initial sync job to test connection
    await this.createSyncJob(created.integrationId, SyncJobType.FULL_SYNC, 'system');

    return created;
  }

  async updateIntegration(
    integrationId: string,
    updates: Partial<Integration>
  ): Promise<Integration | null> {
    const existing = await this.repository.findById(integrationId);
    if (!existing) {
      throw new Error('Integration not found');
    }

    // Validate configuration if being updated
    if (updates.configuration && updates.provider) {
      this.validateConfiguration(updates.provider, updates.configuration);
    }

    return this.repository.update(integrationId, updates);
  }

  async deleteIntegration(integrationId: string): Promise<boolean> {
    return this.repository.delete(integrationId);
  }

  async testConnection(integrationId: string): Promise<{
    success: boolean;
    message: string;
    latency?: number;
  }> {
    const integration = await this.repository.findById(integrationId);
    if (!integration) {
      throw new Error('Integration not found');
    }

    const startTime = Date.now();

    try {
      // Simulate connection test based on provider type
      await this.performProviderConnectionTest(integration);

      const latency = Date.now() - startTime;

      return {
        success: true,
        message: 'Connection successful',
        latency,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Connection failed',
      };
    }
  }

  // ========================================================================
  // SYNC JOB MANAGEMENT
  // ========================================================================

  async createSyncJob(
    integrationId: string,
    jobType: SyncJobType,
    triggeredBy: string
  ): Promise<SyncJob> {
    const integration = await this.repository.findById(integrationId);
    if (!integration) {
      throw new Error('Integration not found');
    }

    if (integration.status !== IntegrationStatus.ACTIVE) {
      throw new Error('Integration must be active to run sync jobs');
    }

    const job = await this.repository.createSyncJob({
      integrationId,
      jobType,
      status: SyncJobStatus.PENDING,
      triggeredBy,
    });

    // Start the sync job asynchronously
    this.executeSyncJob(job.jobId, integration).catch(error => {
      console.error(`Failed to execute sync job ${job.jobId}:`, error);
    });

    return job;
  }

  private async executeSyncJob(jobId: string, integration: Integration): Promise<void> {
    try {
      // Update status to running
      await this.repository.updateSyncJob(jobId, {
        status: SyncJobStatus.RUNNING,
      });

      await this.repository.createSyncJobLog({
        jobId,
        level: 'info',
        message: `Starting ${integration.type} sync job`,
        details: { provider: integration.provider },
      });

      // Execute sync based on integration type
      const result = await this.performSync(integration);

      // Update job with results
      await this.repository.updateSyncJob(jobId, {
        status: SyncJobStatus.COMPLETED,
        recordsProcessed: result.totalProcessed,
        recordsSucceeded: result.succeeded,
        recordsFailed: result.failed,
        completedAt: new Date(),
      });

      // Update integration last sync
      await this.repository.update(integration.integrationId, {
        lastSyncAt: new Date(),
        lastSyncStatus: result.failed > 0 ? 'PARTIAL_FAILURE' : 'SUCCESS',
      });

      await this.repository.createSyncJobLog({
        jobId,
        level: result.failed > 0 ? 'warn' : 'info',
        message: `Sync completed: ${result.succeeded} succeeded, ${result.failed} failed`,
        details: result,
      });
    } catch (error: any) {
      // Update job with error
      await this.repository.updateSyncJob(jobId, {
        status: SyncJobStatus.FAILED,
        completedAt: new Date(),
        errorMessage: error.message,
      });

      await this.repository.createSyncJobLog({
        jobId,
        level: 'error',
        message: 'Sync job failed',
        details: { error: error.message },
      });

      // Update integration last sync status
      await this.repository.update(integration.integrationId, {
        lastSyncAt: new Date(),
        lastSyncStatus: 'FAILED',
      });
    }
  }

  private async performSync(integration: Integration): Promise<{
    totalProcessed: number;
    succeeded: number;
    failed: number;
    details: any;
  }> {
    // Provider-specific sync implementation
    switch (integration.provider) {
      case IntegrationProvider.SAP:
      case IntegrationProvider.ORACLE:
        return this.syncErpSystem(integration);

      case IntegrationProvider.SHOPIFY:
      case IntegrationProvider.WOOCOMMERCE:
      case IntegrationProvider.MAGENTO:
        return this.syncEcommercePlatform(integration);

      case IntegrationProvider.FEDEX:
      case IntegrationProvider.UPS:
      case IntegrationProvider.DHL:
      case IntegrationProvider.USPS:
        return this.syncCarrierSystem(integration);

      default:
        throw new Error(`Unsupported provider: ${integration.provider}`);
    }
  }

  private async syncErpSystem(integration: Integration): Promise<any> {
    // ERP sync implementation
    // This would connect to SAP/Oracle APIs and sync inventory, orders, etc.
    return {
      totalProcessed: 0,
      succeeded: 0,
      failed: 0,
      details: { message: 'ERP sync not yet implemented' },
    };
  }

  private async syncEcommercePlatform(integration: Integration): Promise<any> {
    // E-commerce sync implementation
    // This would connect to Shopify/WooCommerce APIs and sync orders, products
    return {
      totalProcessed: 0,
      succeeded: 0,
      failed: 0,
      details: { message: 'E-commerce sync not yet implemented' },
    };
  }

  private async syncCarrierSystem(integration: Integration): Promise<any> {
    // Carrier sync implementation
    // This would connect to carrier APIs and sync shipment statuses
    return {
      totalProcessed: 0,
      succeeded: 0,
      failed: 0,
      details: { message: 'Carrier sync not yet implemented' },
    };
  }

  // ========================================================================
  // WEBHOOK HANDLING
  // ========================================================================

  async handleWebhook(
    integrationId: string,
    eventType: WebhookEventType,
    payload: any
  ): Promise<WebhookEvent> {
    const integration = await this.repository.findById(integrationId);
    if (!integration) {
      throw new Error('Integration not found');
    }

    // Create webhook event record
    const event = await this.repository.createWebhookEvent({
      integrationId,
      eventType,
      payload,
      status: WebhookEventStatus.PENDING,
      processingAttempts: 0,
    });

    // Process webhook asynchronously
    this.processWebhookEvent(event.eventId, integration).catch(error => {
      console.error(`Failed to process webhook event ${event.eventId}:`, error);
    });

    return event;
  }

  private async processWebhookEvent(eventId: string, integration: Integration): Promise<void> {
    try {
      const event = await this.findWebhookEvent(eventId);
      if (!event || event.status === WebhookEventStatus.PROCESSED) {
        return;
      }

      // Update status to processing
      await this.repository.updateWebhookEvent(eventId, {
        status: WebhookEventStatus.PROCESSING,
        processingAttempts: (event.processingAttempts || 0) + 1,
      });

      // Process based on event type
      await this.executeWebhookAction(event, integration);

      // Mark as processed
      await this.repository.updateWebhookEvent(eventId, {
        status: WebhookEventStatus.PROCESSED,
        processedAt: new Date(),
      });
    } catch (error: any) {
      // Check if we should retry
      const event = await this.findWebhookEvent(eventId);
      if (event && event.processingAttempts! < 3) {
        await this.repository.updateWebhookEvent(eventId, {
          status: WebhookEventStatus.PENDING,
          errorMessage: error.message,
        });

        // Schedule retry with exponential backoff
        const delay = Math.pow(2, event.processingAttempts!) * 1000;
        setTimeout(() => {
          this.processWebhookEvent(eventId, integration).catch(() => {});
        }, delay);
      } else {
        // Max retries reached, mark as failed
        await this.repository.updateWebhookEvent(eventId, {
          status: WebhookEventStatus.FAILED,
          errorMessage: `Max retries exceeded: ${error.message}`,
        });
      }
    }
  }

  private async executeWebhookAction(event: WebhookEvent, integration: Integration): Promise<void> {
    switch (event.eventType) {
      case WebhookEventType.ORDER_CREATED:
        await this.handleOrderCreated(event.payload, integration);
        break;
      case WebhookEventType.ORDER_UPDATED:
        await this.handleOrderUpdated(event.payload, integration);
        break;
      case WebhookEventType.ORDER_CANCELLED:
        await this.handleOrderCancelled(event.payload, integration);
        break;
      case WebhookEventType.PRODUCT_UPDATED:
        await this.handleProductUpdated(event.payload, integration);
        break;
      case WebhookEventType.INVENTORY_UPDATED:
        await this.handleInventoryUpdated(event.payload, integration);
        break;
      case WebhookEventType.SHIPMENT_STATUS_UPDATE:
        await this.handleShipmentStatusUpdate(event.payload, integration);
        break;
      default:
        throw new Error(`Unsupported webhook event type: ${event.eventType}`);
    }
  }

  private async handleOrderCreated(payload: any, integration: Integration): Promise<void> {
    // Handle order creation from e-commerce platform
    console.log('Handling order created webhook:', payload.orderId);
  }

  private async handleOrderUpdated(payload: any, integration: Integration): Promise<void> {
    // Handle order update from e-commerce platform
    console.log('Handling order updated webhook:', payload.orderId);
  }

  private async handleOrderCancelled(payload: any, integration: Integration): Promise<void> {
    // Handle order cancellation from e-commerce platform
    console.log('Handling order cancelled webhook:', payload.orderId);
  }

  private async handleProductUpdated(payload: any, integration: Integration): Promise<void> {
    // Handle product update from e-commerce platform
    console.log('Handling product updated webhook:', payload.productId);
  }

  private async handleInventoryUpdated(payload: any, integration: Integration): Promise<void> {
    // Handle inventory update from ERP system
    console.log('Handling inventory updated webhook:', payload.sku);
  }

  private async handleShipmentStatusUpdate(payload: any, integration: Integration): Promise<void> {
    // Handle shipment status update from carrier
    console.log('Handling shipment status update webhook:', payload.trackingNumber);
  }

  private async findWebhookEvent(eventId: string): Promise<WebhookEvent | null> {
    const events = await this.repository.findWebhookEvents({}, 1);
    return events.find(e => e.eventId === eventId) || null;
  }

  // ========================================================================
  // CARRIER ACCOUNT MANAGEMENT
  // ========================================================================

  async createCarrierAccount(
    account: Omit<CarrierAccount, 'carrierAccountId' | 'createdAt'>
  ): Promise<CarrierAccount> {
    const integration = await this.repository.findById(account.integrationId);
    if (!integration) {
      throw new Error('Integration not found');
    }

    if (integration.type !== IntegrationType.CARRIER) {
      throw new Error('Carrier accounts can only be added to carrier integrations');
    }

    return this.repository.createCarrierAccount(account);
  }

  async updateCarrierAccount(
    carrierAccountId: string,
    updates: Partial<CarrierAccount>
  ): Promise<CarrierAccount | null> {
    return this.repository.updateCarrierAccount(carrierAccountId, updates);
  }

  async deleteCarrierAccount(carrierAccountId: string): Promise<boolean> {
    return this.repository.deleteCarrierAccount(carrierAccountId);
  }

  // ========================================================================
  // PRIVATE HELPER METHODS
  // ========================================================================

  private validateConfiguration(provider: IntegrationProvider, configuration: any): void {
    const requiredFields = this.getRequiredFieldsForProvider(provider);
    const missingFields = requiredFields.filter(field => !configuration[field]);

    if (missingFields.length > 0) {
      throw new Error(
        `Missing required configuration fields for ${provider}: ${missingFields.join(', ')}`
      );
    }
  }

  private getRequiredFieldsForProvider(provider: IntegrationProvider): string[] {
    switch (provider) {
      case IntegrationProvider.SAP:
        return ['host', 'port', 'username', 'client'];
      case IntegrationProvider.ORACLE:
        return ['host', 'port', 'service', 'username'];
      case IntegrationProvider.SHOPIFY:
        return ['shopDomain', 'accessToken'];
      case IntegrationProvider.WOOCOMMERCE:
        return ['storeUrl', 'consumerKey', 'consumerSecret'];
      case IntegrationProvider.MAGENTO:
        return ['storeUrl', 'apiToken'];
      case IntegrationProvider.FEDEX:
        return ['apiKey', 'secretKey', 'accountNumber'];
      case IntegrationProvider.UPS:
        return ['accessLicenseNumber', 'userId', 'password'];
      case IntegrationProvider.DHL:
        return ['siteId', 'password'];
      case IntegrationProvider.USPS:
        return ['userId'];
      default:
        return [];
    }
  }

  private async performProviderConnectionTest(integration: Integration): Promise<void> {
    // Simulate connection test
    // In production, this would make actual API calls to verify credentials
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (integration.configuration.apiKey === 'invalid') {
          reject(new Error('Invalid API credentials'));
        } else {
          resolve();
        }
      }, 500);
    });
  }
}
