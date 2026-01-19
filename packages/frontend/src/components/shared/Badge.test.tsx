/**
 * Badge Component Tests
 */

import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import {
  Badge,
  OrderStatusBadge,
  OrderPriorityBadge,
  UserRoleBadge,
  TaskStatusBadge,
  ProgressBadge,
} from './Badge';
import type { OrderStatus, OrderPriority, UserRole, TaskStatus } from '@opsui/shared';

describe('Badge Component', () => {
  describe('Basic Badge', () => {
    it('renders children correctly', () => {
      renderWithProviders(<Badge>Test Badge</Badge>);
      expect(screen.getByText('Test Badge')).toBeInTheDocument();
    });

    it('applies default variant styles', () => {
      const { container } = renderWithProviders(<Badge>Default</Badge>);
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('bg-gray-100', 'text-gray-800');
    });

    it('applies success variant styles', () => {
      const { container } = renderWithProviders(<Badge variant="success">Success</Badge>);
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('bg-success-100', 'text-success-800');
    });

    it('applies warning variant styles', () => {
      const { container } = renderWithProviders(<Badge variant="warning">Warning</Badge>);
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('bg-warning-100', 'text-warning-800');
    });

    it('applies error variant styles', () => {
      const { container } = renderWithProviders(<Badge variant="error">Error</Badge>);
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('bg-error-100', 'text-error-800');
    });

    it('applies info variant styles', () => {
      const { container } = renderWithProviders(<Badge variant="info">Info</Badge>);
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('bg-primary-100', 'text-primary-800');
    });

    it('applies small size styles', () => {
      const { container } = renderWithProviders(<Badge size="sm">Small</Badge>);
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('px-2', 'py-0.5', 'text-xs');
    });

    it('applies medium size styles by default', () => {
      const { container } = renderWithProviders(<Badge size="md">Medium</Badge>);
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('px-2.5', 'py-0.5', 'text-sm');
    });

    it('applies large size styles', () => {
      const { container } = renderWithProviders(<Badge size="lg">Large</Badge>);
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('px-3', 'py-1', 'text-base');
    });

    it('merges custom className', () => {
      const { container } = renderWithProviders(<Badge className="custom-class">Custom</Badge>);
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('custom-class');
    });

    it('passes through HTML attributes', () => {
      const { container } = renderWithProviders(<Badge data-testid="test-badge">Test</Badge>);
      const badge = container.querySelector('span');
      expect(badge).toHaveAttribute('data-testid', 'test-badge');
    });
  });

  describe('OrderStatusBadge', () => {
    const statuses: OrderStatus[] = [
      'PENDING',
      'PICKING',
      'PICKED',
      'PACKING',
      'PACKED',
      'SHIPPED',
      'CANCELLED',
      'BACKORDER',
    ];

    it.each(statuses)('renders OrderStatusBadge for %s', status => {
      renderWithProviders(<OrderStatusBadge status={status} />);
      expect(screen.getByText(status)).toBeInTheDocument();
    });

    it('applies correct variant for each status', () => {
      const { container: pendingContainer } = renderWithProviders(
        <OrderStatusBadge status="PENDING" />
      );
      const { container: pickingContainer } = renderWithProviders(
        <OrderStatusBadge status="PICKING" />
      );
      const { container: pickedContainer } = renderWithProviders(
        <OrderStatusBadge status="PICKED" />
      );
      const { container: shippedContainer } = renderWithProviders(
        <OrderStatusBadge status="SHIPPED" />
      );
      const { container: cancelledContainer } = renderWithProviders(
        <OrderStatusBadge status="CANCELLED" />
      );

      expect(pendingContainer.querySelector('span')).toHaveClass('bg-primary-100');
      expect(pickingContainer.querySelector('span')).toHaveClass('bg-warning-100');
      expect(pickedContainer.querySelector('span')).toHaveClass('bg-success-100');
      expect(shippedContainer.querySelector('span')).toHaveClass('bg-success-100');
      expect(cancelledContainer.querySelector('span')).toHaveClass('bg-error-100');
    });
  });

  describe('OrderPriorityBadge', () => {
    const priorities: OrderPriority[] = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];

    it.each(priorities)('renders OrderPriorityBadge for %s', priority => {
      renderWithProviders(<OrderPriorityBadge priority={priority} />);
      expect(screen.getByText(priority)).toBeInTheDocument();
    });

    it('applies correct variant for each priority', () => {
      const { container: lowContainer } = renderWithProviders(
        <OrderPriorityBadge priority="LOW" />
      );
      const { container: normalContainer } = renderWithProviders(
        <OrderPriorityBadge priority="NORMAL" />
      );
      const { container: highContainer } = renderWithProviders(
        <OrderPriorityBadge priority="HIGH" />
      );
      const { container: urgentContainer } = renderWithProviders(
        <OrderPriorityBadge priority="URGENT" />
      );

      expect(lowContainer.querySelector('span')).toHaveClass('bg-primary-100');
      expect(normalContainer.querySelector('span')).toHaveClass('bg-gray-100');
      expect(highContainer.querySelector('span')).toHaveClass('bg-warning-100');
      expect(urgentContainer.querySelector('span')).toHaveClass('bg-error-100');
    });
  });

  describe('UserRoleBadge', () => {
    const roles: UserRole[] = ['PICKER', 'PACKER', 'SUPERVISOR', 'ADMIN'];

    it.each(roles)('renders UserRoleBadge for %s', role => {
      renderWithProviders(<UserRoleBadge role={role} />);
      expect(screen.getByText(role)).toBeInTheDocument();
    });
  });

  describe('TaskStatusBadge', () => {
    const taskStatuses: TaskStatus[] = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED'];

    it.each(taskStatuses)('renders TaskStatusBadge for %s', status => {
      renderWithProviders(<TaskStatusBadge status={status} />);
      expect(screen.getByText(status)).toBeInTheDocument();
    });
  });

  describe('ProgressBadge', () => {
    it('renders progress percentage', () => {
      renderWithProviders(<ProgressBadge progress={50} />);
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('applies info variant for progress < 50%', () => {
      const { container } = renderWithProviders(<ProgressBadge progress={25} />);
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('bg-primary-100');
    });

    it('applies warning variant for progress 50-99%', () => {
      const { container } = renderWithProviders(<ProgressBadge progress={75} />);
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('bg-warning-100');
    });

    it('applies success variant for 100% progress', () => {
      const { container } = renderWithProviders(<ProgressBadge progress={100} />);
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('bg-success-100');
    });

    it('handles edge case of exactly 50%', () => {
      const { container } = renderWithProviders(<ProgressBadge progress={50} />);
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('bg-warning-100');
    });
  });
});
