'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function ErrorPage() {
  const [error, setError] = useState<string | null>(null);

  const searchParams = typeof window !== 'undefined' ? useSearchParams() : null;

  useEffect(() => {
    if (searchParams) {
      const error = searchParams.get('error');
      if (error) {
        setError(error);
      }
    }
  }, [searchParams]);

  return (
    <div className='flex min-h-screen flex-col items-center justify-center p-24'>
      <h1 className='text-4xl font-bold mb-4 text-gray-900'>Error</h1>
      <p className='text-lg mb-8 text-gray-700'>{error || 'An unknown error occurred'}</p>
      <a
        href='/auth/signin'
        className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded'>
        Go back to sign-in
      </a>
    </div>
  );
}
