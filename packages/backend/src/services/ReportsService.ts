/**
 * Reports Service
 *
 * Business logic for generating reports, executing queries,
 * and formatting data for export.
 */

import { reportsRepository } from '../repositories/ReportsRepository';
import { pool } from '../db/client';
import {
  Report,
  ReportExecution,
  ReportType,
  ReportStatus,
  ReportFormat,
  AggregationType,
  ExportJob
} from '@opsui/shared';

// ============================================================================
// SERVICE
// ============================================================================

export class ReportsService {
  /**
   * Execute a report and return the results
   */
  async executeReport(
    reportId: string,
    format: ReportFormat,
    parameters: Record<string, any>,
    executedBy: string
  ): Promise<{ execution: ReportExecution; data: any[] }> {
    const report = await reportsRepository.findById(reportId);
    if (!report) {
      throw new Error('Report not found');
    }

    const startTime = Date.now();

    // Create execution record
    const execution: Omit<ReportExecution, 'executionId'> = {
      reportId,
      executedAt: new Date(),
      executedBy,
      status: ReportStatus.RUNNING,
      format,
      parameters
    };

    try {
      // Build and execute the query
      const query = this.buildReportQuery(report, parameters);
      const result = await pool.query(query.sql, query.params);

      // Process and format results
      const data = this.processResults(result.rows, report, parameters);

      // Calculate execution time
      const executionTimeMs = Date.now() - startTime;

      // Update execution record
      const completedExecution = await reportsRepository.createExecution({
        ...execution,
        status: ReportStatus.COMPLETED,
        rowCount: result.rowCount,
        executionTimeMs,
        fileUrl: this.generateFileUrl(reportId, format)
      });

      return { execution: completedExecution, data };
    } catch (error: any) {
      const executionTimeMs = Date.now() - startTime;

      // Log failed execution
      await reportsRepository.createExecution({
        ...execution,
        status: ReportStatus.FAILED,
        executionTimeMs,
        errorMessage: error.message
      });

      throw error;
    }
  }

  /**
   * Build SQL query from report definition
   */
  private buildReportQuery(report: Report, parameters: Record<string, any>): { sql: string; params: any[] } {
    const { fields, filters, groups } = report;

    // Build SELECT clause
    const selectFields = fields.map((field: any) => {
      if (field.aggregation) {
        return `${field.aggregation}(${field.field}) as ${field.name}`;
      }
      return `${field.field} as ${field.name}`;
    });

    let sql = `SELECT ${selectFields.join(', ')} FROM ${this.getDataSource(report.reportType)}`;

    // Build WHERE clause from filters
    const whereClauses: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (filters && filters.length > 0) {
      for (const filter of filters) {
        const clause = this.applyFilter(filter, parameters, paramIndex);
        if (clause) {
          whereClauses.push(clause.sql);
          queryParams.push(...clause.params);
          paramIndex += clause.params.length;
        }
      }
    }

    if (whereClauses.length > 0) {
      sql += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    // Build GROUP BY clause
    if (groups && groups.length > 0) {
      const groupFields = groups.map((g: any) => g.field);
      sql += ` GROUP BY ${groupFields.join(', ')}`;
    }

    // Build ORDER BY clause
    if (groups && groups.length > 0) {
      const orderFields = groups
        .filter((g: any) => g.sortDirection)
        .map((g: any) => `${g.field} ${g.sortDirection}`);
      sql += ` ORDER BY ${orderFields.join(', ')}`;
    }

    return { sql, params: queryParams };
  }

  /**
   * Get data source table for report type
   */
  private getDataSource(reportType: ReportType): string {
    const sources: Record<ReportType, string> = {
      [ReportType.INVENTORY]: 'inventory',
      [ReportType.ORDERS]: 'orders',
      [ReportType.SHIPPING]: 'shipments',
      [ReportType.RECEIVING]: 'inbound_shipments',
      [ReportType.PICKING_PERFORMANCE]: 'pick_tasks',
      [ReportType.PACKING_PERFORMANCE]: 'packing_tasks',
      [ReportType.CYCLE_COUNTS]: 'cycle_counts',
      [ReportType.LOCATION_UTILIZATION]: 'locations',
      [ReportType.USER_PERFORMANCE]: 'users',
      [ReportType.CUSTOM]: 'custom_data'
    };

    return sources[reportType] || 'data';
  }

  /**
   * Apply filter to query
   */
  private applyFilter(filter: any, parameters: Record<string, any>, startIndex: number): { sql: string; params: any[] } | null {
    const paramValue = parameters[filter.field];

    if (paramValue === undefined || paramValue === null) {
      return null;
    }

    const params: any[] = [];

    switch (filter.operator) {
      case 'equals':
        params.push(paramValue);
        return { sql: `${filter.field} = $${startIndex++}`, params };

      case 'not_equals':
        params.push(paramValue);
        return { sql: `${filter.field} != $${startIndex++}`, params };

      case 'contains':
        params.push(`%${paramValue}%`);
        return { sql: `${filter.field} LIKE $${startIndex++}`, params };

      case 'greater_than':
        params.push(paramValue);
        return { sql: `${filter.field} > $${startIndex++}`, params };

      case 'less_than':
        params.push(paramValue);
        return { sql: `${filter.field} < $${startIndex++}`, params };

      case 'between':
        params.push(paramValue[0], paramValue[1]);
        return { sql: `${filter.field} BETWEEN $${startIndex++} AND $${startIndex++}`, params };

      case 'in':
        params.push(paramValue);
        return { sql: `${filter.field} = ANY($${startIndex++})`, params };

      default:
        return null;
    }
  }

  /**
   * Process query results
   */
  private processResults(rows: any[], report: Report, parameters: Record<string, any>): any[] {
    return rows.map((row, index) => {
      const processed: any = {};

      report.fields.forEach((field: any) => {
        processed[field.name] = row[field.name];
      });

      // Add row number for exports
      processed._rowNumber = index + 1;

      return processed;
    });
  }

  /**
   * Generate file URL for report output
   */
  private generateFileUrl(reportId: string, format: ReportFormat): string {
    const timestamp = new Date().getTime();
    return `/reports/${reportId}/${timestamp}.${format.toLowerCase()}`;
  }

  /**
   * Create an export job
   */
  async createExportJob(
    entityType: string,
    format: ReportFormat,
    fields: string[],
    filters: any[],
    createdBy: string
  ): Promise<ExportJob> {
    const job = await reportsRepository.createExportJob({
      name: `${entityType} Export`,
      entityType,
      format,
      filters,
      fields,
      status: ReportStatus.PENDING,
      createdBy
    });

    // Start async export (in production, this would be a background job)
    this.processExportJob(job.jobId).catch(console.error);

    return job;
  }

  /**
   * Process export job (async)
   */
  private async processExportJob(jobId: string): Promise<void> {
    // TODO: Implement actual export processing
    // This would generate CSV/Excel files based on the job configuration
    console.log('Processing export job:', jobId);
  }
}

export const reportsService = new ReportsService();
