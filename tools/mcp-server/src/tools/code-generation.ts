/**
 * Code Generation Tools
 * Tools for generating boilerplate code, entities, services, etc.
 */

import { promises as fs } from 'fs';
import path from 'path';
import Handlebars from 'handlebars';
import { validateInput, toolSchemas } from '../utils/validator.js';
import { camelCase, pascalCase, snakeCase } from 'change-case';
import type { ToolMetadata, ToolContext, ToolArgs } from '../types/index.js';

/**
 * Entity template
 */
const entityTemplate = Handlebars.compile(`import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export class {{ClassName}} {
  @PrimaryGeneratedColumn('uuid')
  id: string;

{{#each fields}}
  @Column({{
    {{#if isEnum}}type: 'enum', enum: {{enumName}},{{/if}}
    {{#if isString}}type: 'varchar',{{/if}}
    {{#if isNumber}}type: 'integer',{{/if}}
    {{#if isBoolean}}type: 'boolean',{{/if}}
    {{#if isDate}}type: 'timestamp',{{/if}}
    {{#if isRequired}}nullable: false{{else}}nullable: true{{/if}}
  }})
  {{camelName}}: {{#if isOptional}}{{typeName}} | null{{else}}{{typeName}}{{/if}};

{{/each}}
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
`);

/**
 * Service template
 */
const serviceTemplate = Handlebars.compile(`import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { {{ClassName}} } from './{{className}}.entity';

@Injectable()
export class {{ClassName}}Service {
  constructor(
    @InjectRepository({{ClassName}})
    private readonly {{camelName}}Repository: Repository<{{ClassName}}>,
  ) {}

  async findAll(): Promise<{{ClassName}}[]> {
    return this.{{camelName}}Repository.find();
  }

  async findOne(id: string): Promise<{{ClassName}} | null> {
    return this.{{camelName}}Repository.findOne({ where: { id } });
  }

  async create(data: Create{{ClassName}}Dto): Promise<{{ClassName}}> {
    const entity = this.{{camelName}}Repository.create(data);
    return this.{{camelName}}Repository.save(entity);
  }

  async update(id: string, data: Update{{ClassName}}Dto): Promise<{{ClassName}}> {
    await this.{{camelName}}Repository.update(id, data);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.{{camelName}}Repository.delete(id);
  }
}
`);

/**
 * Controller template
 */
const controllerTemplate = Handlebars.compile(`import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { {{ClassName}}Service } from './{{className}}.service';
import { Create{{ClassName}}Dto, Update{{ClassName}}Dto } from './dto/{{kebabName}}.dto';

@Controller('{{kebabName}}')
export class {{ClassName}}Controller {
  constructor(private readonly {{camelName}}Service: {{ClassName}}Service) {}

  @Get()
  findAll() {
    return this.{{camelName}}Service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.{{camelName}}Service.findOne(id);
  }

  @Post()
  create(@Body() createDto: Create{{ClassName}}Dto) {
    return this.{{camelName}}Service.create(createDto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateDto: Update{{ClassName}}Dto) {
    return this.{{camelName}}Service.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.{{camelName}}Service.remove(id);
  }
}
`);

export const codeGenerationTools: ToolMetadata[] = [
  {
    name: 'generate_entity',
    description: 'Generate a TypeORM entity with TypeScript',
    inputSchema: {
      type: 'object',
      properties: {
        entityName: {
          type: 'string',
          description: 'Name of the entity (e.g., User, Product, Order)',
        },
        fields: {
          type: 'array',
          description: 'Array of field definitions',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              type: { type: 'string', enum: ['string', 'number', 'boolean', 'date', 'enum'] },
              required: { type: 'boolean' },
              enumName: { type: 'string' },
            },
          },
        },
        outputPath: {
          type: 'string',
          description: 'Output path relative to project root',
        },
      },
      required: ['entityName', 'fields'],
    },
    handler: async (args: ToolArgs, context: ToolContext) => {
      const { entityName, fields, outputPath } = args as {
        entityName: string;
        fields: Array<{
          name: string;
          type: 'string';
          required?: boolean;
          enumName?: string;
        }>;
        outputPath?: string;
      };

      // Validate entity name
      if (!/^[A-Z][a-zA-Z0-9]*$/.test(entityName)) {
        throw new Error('Entity name must start with uppercase letter and contain only letters and numbers');
      }

      // Process fields
      const processedFields = fields.map((field) => {
        const fieldName = field.name;
        const fieldType = field.type;

        let typeName = 'string';
        let isString = false;
        let isNumber = false;
        let isBoolean = false;
        let isDate = false;
        let isEnum = false;
        let isRequired = field.required !== false;
        let isOptional = !isRequired;

        switch (fieldType as string) {
          case 'string':
            typeName = 'string';
            isString = true;
            break;
          case 'number':
            typeName = 'number';
            isNumber = true;
            break;
          case 'boolean':
            typeName = 'boolean';
            isBoolean = true;
            break;
          case 'date':
            typeName = 'Date';
            isDate = true;
            break;
          case 'enum':
            typeName = field.enumName || `${pascalCase(fieldName)}Enum`;
            isEnum = true;
            break;
        }

        return {
          name: fieldName,
          camelName: camelCase(fieldName),
          typeName,
          isString,
          isNumber,
          isBoolean,
          isDate,
          isEnum,
          enumName: field.enumName,
          isRequired,
          isOptional,
        };
      });

      const className = pascalCase(entityName);
      const camelName = camelCase(entityName);

      const entityCode = entityTemplate({
        ClassName: className,
        camelName,
        fields: processedFields,
      });

      // Write to file
      const defaultPath = path.join('src', 'entities', `${camelName}.entity.ts`);
      const finalPath = outputPath || defaultPath;
      const fullPath = path.join(context.workspaceRoot, finalPath);

      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, entityCode, 'utf-8');

      return {
        success: true,
        file: finalPath,
        message: `Generated entity: ${className}`,
        code: entityCode,
      };
    },
    options: {
      timeout: 10000,
    },
  },

  {
    name: 'generate_service',
    description: 'Generate a NestJS service with CRUD operations',
    inputSchema: {
      type: 'object',
      properties: {
        entityName: {
          type: 'string',
          description: 'Name of the entity (e.g., User, Product)',
        },
        outputPath: {
          type: 'string',
          description: 'Output path relative to project root',
        },
      },
      required: ['entityName'],
    },
    handler: async (args: ToolArgs, context: ToolContext) => {
      const { entityName, outputPath } = args as {
        entityName: string;
        outputPath?: string;
      };

      const className = pascalCase(entityName);
      const camelName = camelCase(entityName);
      const kebabName = snakeCase(entityName);

      const serviceCode = serviceTemplate({
        ClassName: className,
        camelName,
      });

      const defaultPath = path.join('src', `${kebabName}`, `${kebabName}.service.ts`);
      const finalPath = outputPath || defaultPath;
      const fullPath = path.join(context.workspaceRoot, finalPath);

      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, serviceCode, 'utf-8');

      return {
        success: true,
        file: finalPath,
        message: `Generated service: ${className}Service`,
        code: serviceCode,
      };
    },
    options: {
      timeout: 10000,
    },
  },

  {
    name: 'generate_controller',
    description: 'Generate a NestJS controller with REST endpoints',
    inputSchema: {
      type: 'object',
      properties: {
        entityName: {
          type: 'string',
          description: 'Name of the entity (e.g., User, Product)',
        },
        outputPath: {
          type: 'string',
          description: 'Output path relative to project root',
        },
      },
      required: ['entityName'],
    },
    handler: async (args: ToolArgs, context: ToolContext) => {
      const { entityName, outputPath } = args as {
        entityName: string;
        outputPath?: string;
      };

      const className = pascalCase(entityName);
      const camelName = camelCase(entityName);
      const kebabName = snakeCase(entityName);

      const controllerCode = controllerTemplate({
        ClassName: className,
        camelName,
        kebabName,
      });

      const defaultPath = path.join('src', `${kebabName}`, `${kebabName}.controller.ts`);
      const finalPath = outputPath || defaultPath;
      const fullPath = path.join(context.workspaceRoot, finalPath);

      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, controllerCode, 'utf-8');

      return {
        success: true,
        file: finalPath,
        message: `Generated controller: ${className}Controller`,
        code: controllerCode,
      };
    },
    options: {
      timeout: 10000,
    },
  },
];
