'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/services/supabaseService';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isForgot, setIsForgot] = useState(false);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your administrator email address.');
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined,
      });
      if (resetError) throw resetError;
      setMessage('Password reset instructions have been sent to your email.');
    } catch (err: any) {
      const isNetworkError = err?.message?.toLowerCase().includes('fetch') ||
        err?.message?.toLowerCase().includes('network') ||
        err?.message?.toLowerCase().includes('failed to fetch');
      if (isNetworkError) {
        setError('Supabase authentication service is currently unreachable. Please check your network connection or verify your Supabase service status.');
      } else {
        setError(err?.message || 'Failed to send password reset email.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        const isNetworkError = signInError.message?.toLowerCase().includes('fetch') ||
          signInError.message?.toLowerCase().includes('network') ||
          signInError.message?.toLowerCase().includes('failed to fetch');

        if (isNetworkError) {
          setError('Supabase authentication service is currently unreachable. Please check your network connection or verify that Supabase is operational. Administrative access requires verified Supabase authentication.');
        } else {
          setError(signInError.message || 'Invalid email or password. Please verify your credentials.');
        }
        setLoading(false);
        return;
      }

      if (data?.session) {
        document.cookie = `supabase-auth-token=${data.session.access_token}; path=/; max-age=${data.session.expires_in}; SameSite=Lax`;
        window.location.href = '/admin/restaurants';
      } else {
        setError('Authentication failed. No active session returned by authentication server.');
      }
    } catch (err: any) {
      const isNetworkError = err?.message?.toLowerCase().includes('fetch') ||
        err?.message?.toLowerCase().includes('network') ||
        err?.message?.toLowerCase().includes('failed to fetch');
      if (isNetworkError) {
        setError('Supabase authentication service is currently unreachable. Please check your network connection or verify that Supabase is operational. Administrative access requires verified Supabase authentication.');
      } else {
        setError(err?.message || 'Authentication failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* Background Gradients (Subtle) */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-20%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[50%] h-[50%] bg-accent/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="glass-card p-8 rounded-2xl shadow-xl border border-white/50">
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground font-bold shadow-lg shadow-primary/20 mb-4 text-2xl">
              VD
            </div>
            <h1 className="text-2xl font-bold text-foreground">VisionDine 2.0</h1>
            <p className="text-sm text-muted-foreground">Super Admin Management Console</p>
          </div>

          {isForgot ? (
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div className="text-sm text-muted-foreground mb-2">
                Enter your administrator email to receive a password recovery link via Supabase Auth.
              </div>
              {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
                  {error}
                </div>
              )}
              {message && (
                <div className="bg-green-50 text-green-600 text-sm p-3 rounded-lg">
                  {message}
                </div>
              )}
              <Input
                label="Administrator Email"
                type="email"
                placeholder="usaidowais123@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Button fullWidth size="lg" type="submit" isLoading={loading} className="mt-2 text-lg">
                Send Reset Link
              </Button>
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => { setIsForgot(false); setError(null); setMessage(null); }}
                  className="text-sm text-primary hover:underline"
                >
                  ← Back to Sign In
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleAuth} className="space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
                  {error}
                </div>
              )}
              {message && (
                <div className="bg-green-50 text-green-600 text-sm p-3 rounded-lg">
                  {message}
                </div>
              )}
              <Input
                label="Email Address"
                type="email"
                placeholder="admin@visiondine.site"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-foreground">Password</label>
                  <button
                    type="button"
                    onClick={() => { setIsForgot(true); setError(null); setMessage(null); }}
                    className="text-xs text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <Button fullWidth size="lg" type="submit" isLoading={loading} className="mt-2 text-lg">
                Sign In
              </Button>
            </form>
          )}

          <div className="mt-8 pt-6 border-t border-border/50 text-center">
            <p className="text-xs text-muted-foreground">
              VisionDine 2.0 Super Admin — Authorised personnel only.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
