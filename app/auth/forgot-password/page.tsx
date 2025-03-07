'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail } from 'lucide-react';
import Image from 'next/image';
import { initiatePasswordReset } from '../actions';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await initiatePasswordReset(email);
      if (!result.success) {
        throw new Error(result.error);
      }
      setSuccess(true);
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
          <>
            <Alert variant='default' className='mb-6'>
              <Mail className='h-4 w-4' />
              <AlertDescription>
                If an account exists with this email, you will receive password reset instructions.
              </AlertDescription>
            </Alert>
            <Link href='/auth/signin' className='text-white hover:text-gray-200'>
              Back to Sign In
            </Link>
          </>
        ) : (
          <form onSubmit={handleSubmit} className='space-y-6'>
            <div className='space-y-2'>
              <Label htmlFor='email' className='text-white'>
                Email
              </Label>
              <Input
                id='email'
                type='email'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className='bg-white'
                disabled={loading}
              />
            </div>
            <Button
              type='submit'
              className='w-full bg-white text-[#152f48] hover:bg-gray-200'
              disabled={loading}>
              {loading ? 'Sending...' : 'Reset Password'}
            </Button>
            <Link href='/auth/signin'>
              <Button
                type='button'
                className='w-full bg-transparent text-white hover:opacity-80 border border-white mt-8'
                disabled={loading}>
                Go Back
              </Button>
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
