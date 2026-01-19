/**
 * OpenAPI/Swagger Documentation Generator
 *
 * This file automatically generates API documentation from Joi schemas
 * and route definitions using Express-compatible swagger-jsdoc.
 */

import swaggerJSDoc from 'swagger-jsdoc';
import * as swaggerUi from 'swagger-ui-express';

/**
 * OpenAPI/Swagger configuration for the WMS API
 */
export const swaggerOptions: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Warehouse Management System API',
      version: '1.0.0',
      description: `A comprehensive Warehouse Management System API for order fulfillment,
        inventory tracking, and warehouse operations.

        ## Authentication

        Most endpoints require authentication using JWT tokens. Include the token
        in the Authorization header:

        Authorization: Bearer <your-jwt-token>

        ## Workflow States

        Orders progress through these states:
        - **PENDING** → Order created, waiting to be picked
        - **PICKING** → Picker is actively gathering items
        - **PICKED** → All items gathered, ready for packing
        - **PACKING** → Packer is preparing shipment
        - **PACKED** → Shipment prepared, awaiting carrier
        - **SHIPPED** → Order has been shipped to customer

        ## Rate Limiting

        - General API: 100 requests per 15 minutes
        - Authentication: 5 attempts per 15 minutes
      `,
      contact: {
        name: 'WMS Support',
        email: 'support@wms.local'
      },
      license: {
        name: 'ISC'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server'
      },
      {
        url: 'https://api.wms.production.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from login endpoint'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message'
            },
            code: {
              type: 'string',
              description: 'Error code'
            },
            statusCode: {
              type: 'integer',
              description: 'HTTP status code'
            },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string'
                  },
                  message: {
                    type: 'string'
                  }
                }
              }
            }
          }
        },
        OrderStatus: {
          type: 'string',
          enum: ['PENDING', 'PICKING', 'PICKED', 'PACKING', 'PACKED', 'SHIPPED', 'CANCELLED', 'BACKORDER'],
          description: 'Order status in the fulfillment workflow'
        },
        OrderPriority: {
          type: 'string',
          enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
          description: 'Order priority level'
        },
        UserRole: {
          type: 'string',
          enum: ['ADMIN', 'PICKER', 'PACKER'],
          description: 'User role for access control'
        },
        Order: {
          type: 'object',
          properties: {
            orderId: {
              type: 'string',
              description: 'Unique order identifier',
              example: 'ORD-20250112-123456'
            },
            customerId: {
              type: 'string',
              description: 'Customer identifier',
              example: 'CUST-001'
            },
            customerName: {
              type: 'string',
              description: 'Customer name',
              example: 'John Doe'
            },
            status: {
              $ref: '#/components/schemas/OrderStatus'
            },
            priority: {
              $ref: '#/components/schemas/OrderPriority'
            },
            pickerId: {
              type: 'string',
              nullable: true,
              description: 'Assigned picker ID'
            },
            packerId: {
              type: 'string',
              nullable: true,
              description: 'Assigned packer ID'
            },
            items: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/OrderItem'
              }
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Order creation timestamp'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp'
            }
          }
        },
        OrderItem: {
          type: 'object',
          properties: {
            orderItemId: {
              type: 'string',
              description: 'Unique order item identifier'
            },
            sku: {
              type: 'string',
              description: 'Stock Keeping Unit',
              example: 'PROD-001'
            },
            quantity: {
              type: 'integer',
              minimum: 1,
              description: 'Ordered quantity',
              example: 10
            },
            pickedQuantity: {
              type: 'integer',
              minimum: 0,
              description: 'Quantity picked so far',
              example: 0
            },
            binLocation: {
              type: 'string',
              pattern: '^[A-Z]-\\d{1,3}-\\d{2}$',
              description: 'Bin location (Zone-Aisle-Shelf)',
              example: 'A-12-03'
            }
          }
        },
        PickTask: {
          type: 'object',
          properties: {
            taskId: {
              type: 'string',
              description: 'Unique pick task identifier'
            },
            orderId: {
              type: 'string',
              description: 'Associated order ID'
            },
            sku: {
              type: 'string',
              description: 'Product SKU'
            },
            quantity: {
              type: 'integer',
              minimum: 1,
              description: 'Quantity to pick'
            },
            binLocation: {
              type: 'string',
              description: 'Bin location'
            },
            status: {
              type: 'string',
              enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED'],
              description: 'Task status'
            },
            pickerId: {
              type: 'string',
              nullable: true,
              description: 'Assigned picker'
            },
            priority: {
              $ref: '#/components/schemas/OrderPriority'
            }
          }
        },
        Inventory: {
          type: 'object',
          properties: {
            sku: {
              type: 'string',
              description: 'Stock Keeping Unit'
            },
            productName: {
              type: 'string',
              description: 'Product name'
            },
            quantity: {
              type: 'integer',
              minimum: 0,
              description: 'Total quantity in bin'
            },
            reserved: {
              type: 'integer',
              minimum: 0,
              description: 'Reserved quantity for orders'
            },
            available: {
              type: 'integer',
              minimum: 0,
              description: 'Available quantity (quantity - reserved)'
            },
            binLocation: {
              type: 'string',
              description: 'Bin location'
            },
            lowStockThreshold: {
              type: 'integer',
              minimum: 0,
              description: 'Low stock alert threshold'
            }
          }
        }
      },
      tags: [
        {
          name: 'Auth',
          description: 'Authentication endpoints'
        },
        {
          name: 'Orders',
          description: 'Order management'
        },
        {
          name: 'Picking',
          description: 'Picker operations'
        },
        {
          name: 'Packing',
          description: 'Packer operations'
        },
        {
          name: 'Inventory',
          description: 'Inventory management'
        },
        {
          name: 'Users',
          description: 'User management (Admin)'
        },
        {
          name: 'Analytics',
          description: 'Reports and analytics (Admin)'
        },
        {
          name: 'Health',
          description: 'Health check endpoints'
        }
      ]
    }
  },
  apis: ['./src/routes/**/*.ts', './src/controllers/**/*.ts']
};

/**
 * Generate Swagger specification
 */
export const swaggerSpec = swaggerJSDoc(swaggerOptions);

/**
 * Setup Swagger documentation for Express app
 */
export function setupSwagger(app: any): void {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customSiteTitle: 'WMS API Docs',
    customCss: `
      .topbar-wrapper .link {
        display: none;
      }
      .swagger-ui .topbar {
        background-color: #1a1a1a;
      }
      .info {
        margin: 20px 0;
      }
    `
  }));
}

/**
 * Helper to generate Swagger schema from Joi validator
 * This can be used to auto-generate schemas from Joi validators
 */
export function generateSwaggerFromJoi(joiSchema: any): any {
  // This is a placeholder for future enhancement
  // For now, schemas are defined manually in swaggerOptions
  return joiSchema;
}