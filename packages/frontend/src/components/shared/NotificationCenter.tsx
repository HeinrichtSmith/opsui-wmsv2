/**
 * NotificationCenter component
 *
 * Displays toast notifications
 */

import { useEffect } from 'react';
import { useUIStore } from '@/stores';
import { cn } from '@/lib/utils';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

// ============================================================================
// COMPONENTS
// ============================================================================

const iconMap = {
  success: CheckCircleIcon,
  error: ExclamationCircleIcon,
  warning: ExclamationTriangleIcon,
  info: InformationCircleIcon,
};

const colorMap = {
  success: 'text-success-400 bg-success-500/20 border border-success-500/30',
  error: 'text-error-400 bg-error-500/20 border border-error-500/30',
  warning: 'text-warning-400 bg-warning-500/20 border border-warning-500/30',
  info: 'text-primary-400 bg-primary-500/20 border border-primary-500/30',
};

export function NotificationCenter() {
  const notifications = useUIStore((state) => state.notifications);
  const removeNotification = useUIStore((state) => state.removeNotification);

  // Auto-focus notifications when they appear (for accessibility)
  useEffect(() => {
    if (notifications.length > 0) {
      const latest = notifications[notifications.length - 1];
      const element = document.getElementById(`notification-${latest.id}`);
      element?.focus();
    }
  }, [notifications]);

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
    >
      {notifications.map((notification) => {
        const Icon = iconMap[notification.type];
        const colors = colorMap[notification.type];

        return (
          <div
            key={notification.id}
            id={`notification-${notification.id}`}
            tabIndex={-1}
            className={cn(
              'flex items-start gap-3 p-4 rounded-xl shadow-premium glass-card',
              'animate-in slide-in-from-right-full',
              'transition-all duration-300 border border-white/[0.08]'
            )}
          >
            <div className={cn('flex-shrink-0 p-2 rounded-full', colors)}>
              <Icon className="h-5 w-5" aria-hidden="true" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">
                {notification.message}
              </p>
            </div>

            <button
              onClick={() => removeNotification(notification.id)}
              className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-300 transition-colors"
              aria-label="Close notification"
            >
              <XMarkIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
