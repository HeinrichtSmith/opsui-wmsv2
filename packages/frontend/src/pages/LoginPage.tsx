/**
 * Login page
 *
 * User authentication form
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/stores';
import { authApi } from '@/services/api';
import { Button } from '@/components/shared';
import { showSuccess, showError } from '@/stores/uiStore';

// ============================================================================
// COMPONENT
// ============================================================================

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore(state => state.login);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onMutate: () => {
      setIsLoading(true);
    },
    onSuccess: data => {
      // Check if user data exists
      if (!data || !data.user) {
        showError('Login response missing user data');
        return;
      }

      login(data);
      showSuccess('Welcome back!');
      // Navigate based on user role
      if (data.user.role === 'PICKER') {
        navigate('/orders');
      } else {
        navigate('/dashboard');
      }
    },
    onError: (error: Error) => {
      showError(error.message);
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      showError('Please enter email and password');
      return;
    }

    loginMutation.mutate({ email, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 py-12">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-responsive-xl font-bold text-white tracking-tight">OpsUI</h1>
          <p className="mt-2 text-gray-400 text-responsive-sm">Warehouse Management System</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="glass-card rounded-xl p-6 sm:p-8 space-y-6 card-hover">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-300 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                required
                className="mobile-input block w-full px-4 py-3 border rounded-xl bg-white/[0.05] border-white/[0.08] text-white placeholder:text-gray-500 focus:border-primary-500/50 focus:bg-white/[0.08] focus:shadow-glow transition-all duration-300"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-300 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="mobile-input block w-full px-4 py-3 border rounded-xl bg-white/[0.05] border-white/[0.08] text-white placeholder:text-gray-500 focus:border-primary-500/50 focus:bg-white/[0.08] focus:shadow-glow transition-all duration-300"
                placeholder="Enter your password"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isLoading}
              disabled={loginMutation.isPending}
              className="shadow-glow touch-target"
            >
              Sign In
            </Button>
          </div>
        </form>

        {/* Mobile-specific help text */}
        <div className="text-center sm:hidden">
          <p className="text-xs text-gray-500">Use your warehouse credentials to sign in</p>
        </div>
      </div>
    </div>
  );
}
