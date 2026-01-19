/**
 * Badge component - Premium dark theme
 */

import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import type { OrderStatus, OrderPriority, UserRole, TaskStatus } from '@opsui/shared';

// ============================================================================
// TYPES
// ============================================================================

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'primary';
  size?: 'sm' | 'md' | 'lg';
}

// ============================================================================
// HELPERS
// ============================================================================

const statusVariantMap: Record<OrderStatus, BadgeProps['variant']> = {
  PENDING: 'info',
  PICKING: 'warning',
  PICKED: 'success',
  PACKING: 'info',
  PACKED: 'info',
  SHIPPED: 'success',
  CANCELLED: 'error',
  BACKORDER: 'error',
};

const priorityVariantMap: Record<OrderPriority, BadgeProps['variant']> = {
  LOW: 'info',
  NORMAL: 'primary',
  HIGH: 'warning',
  URGENT: 'error',
};

const roleVariantMap: Record<UserRole, BadgeProps['variant']> = {
  PICKER: 'info',
  PACKER: 'info',
  SUPERVISOR: 'warning',
  ADMIN: 'error',
};

const taskStatusVariantMap: Record<TaskStatus, BadgeProps['variant']> = {
  PENDING: 'info',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  SKIPPED: 'error',
};

// ============================================================================
// COMPONENT
// ============================================================================

export function Badge({
  variant = 'default',
  size = 'md',
  className,
  children,
  ...props
}: BadgeProps) {
  const baseStyles = 'badge';

  const variantStyles: Record<string, string> = {
    default: 'badge-info',
    success: 'badge-success',
    warning: 'badge-warning',
    error: 'badge-error',
    info: 'badge-info',
    primary: 'badge-primary',
  };

  const sizeStyles = {
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  return (
    <span
      className={cn(
        baseStyles,
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

// ============================================================================
// SPECIALIZED BADGES
// ============================================================================

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge variant={statusVariantMap[status]} size="sm">
      {status}
    </Badge>
  );
}

export function OrderPriorityBadge({ priority }: { priority: OrderPriority }) {
  return (
    <Badge variant={priorityVariantMap[priority]} size="sm">
      {priority}
    </Badge>
  );
}

export function UserRoleBadge({ role }: { role: UserRole }) {
  return (
    <Badge variant={roleVariantMap[role]} size="sm">
      {role}
    </Badge>
  );
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return (
    <Badge variant={taskStatusVariantMap[status]} size="sm">
      {status}
    </Badge>
  );
}

// Progress badge
export function ProgressBadge({ progress }: { progress: number }) {
  let variant: BadgeProps['variant'] = 'info';
  if (progress === 100) variant = 'success';
  else if (progress > 50) variant = 'primary';

  return (
    <Badge variant={variant} size="sm">
      {progress}%
    </Badge>
  );
}
