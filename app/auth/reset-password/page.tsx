'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { resetPassword } from '../actions';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  if (typeof window === 'undefined') return null;

  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      router.replace('/auth/signin');
    }
  }, [token, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      if (!token) throw new Error('Invalid reset token');

      const result = await resetPassword(token, password);
      if (!result.success) {
        throw new Error(result.error);
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/auth/signin');
      }, 3000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='flex min-h-screen w-full bg-[#152f48] flex-col justify-center items-center'>
      <div className='w-full max-w-md px-8 mb-12'>
        <div className='flex justify-center mb-8'>
          <Image
            src='/express-connect-logo.png'
            alt='Express Connect Logo'
            width={192}
            height={64}
            className='mb-2'
          />
        </div>

        {error && (
          <Alert variant='destructive' className='mb-6'>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success ? (
          <Alert variant='default' className='mb-6'>
            <AlertDescription>
              Password successfully reset. Redirecting to login...
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} className='space-y-6'>
            <div className='space-y-2'>
              <Label htmlFor='password' className='text-white'>
                New Password
              </Label>
              <Input
                id='password'
                type='password'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className='bg-white'
                disabled={loading}
                minLength={8}
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='confirmPassword' className='text-white'>
                Confirm Password
              </Label>
              <Input
                id='confirmPassword'
                type='password'
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className='bg-white'
                disabled={loading}
                minLength={8}
              />
            </div>

            <Button
              type='submit'
              className='w-full bg-white text-[#152f48] hover:bg-gray-200'
              disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
