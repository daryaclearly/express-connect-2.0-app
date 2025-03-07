'use client'; // This ensures it's a client component
/**
 * SignInPage component handles the user sign-in process.
 *
 * This component includes:
 * - Email input for the user to enter their email address.
 * - OTP code input for the user to enter the OTP code sent to their email.
 * - Error and success alerts to inform the user of the status of their sign-in attempt.
 * - Conditional rendering to show either the email input form or the OTP code input form.
 *
 * The component uses the following hooks:
 * - `useState` to manage local state for email, loading, error, success, OTP code, and showOTP.
 * - `useEffect` to handle side effects such as checking for errors in URL search parameters and redirecting authenticated users.
 * - `useSession` to get the current session status.
 * - `useRouter` to programmatically navigate the user.
 * - `useSearchParams` to access URL search parameters.
 *
 * The component also includes two form submission handlers:
 * - `handleSubmit` to handle the initial email submission and send a magic link to the user's email.
 * - `handleOTPSubmit` to handle the OTP code submission and redirect the user to the callback URL.
 *
 * @returns {JSX.Element | null} The rendered sign-in page component or null if the router is not available or the user is already authenticated.
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Mail } from 'lucide-react';
import Image from 'next/image';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { checkUserStatus, createPassword } from '../actions';

const SignInPage = () => {
  const session = useSession();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [OTPCode, setOTPCode] = useState('');
  const [showOTP, setShowOTP] = useState(false);

  const [searchParams, setSearchParams] = useState<URLSearchParams | null>(null);

  const [authMethod, setAuthMethod] = useState<'otp' | 'password'>('otp');
  const [isCreatingPassword, setIsCreatingPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSearchParams(new URLSearchParams(window.location.search));
    }
  }, []);

  useEffect(() => {
    if (searchParams) {
      const error = searchParams.get('error');
      console.log('SignInPage - error', error);
      if (error) {
        setError(error);
      }
    }
  }, [searchParams]);

  // Debounce the check to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setError('');
      if (email && email.includes('@')) {
        checkUserStatus(email).then((result) => {
          console.log('checkUserStatus result ==>', result);
          if (result.exists && !result.hasPassword) {
            setIsCreatingPassword(true);
          } else if (result.exists && result.hasPassword) {
            setAuthMethod('password');
          } else if (!result.exists) {
            setError('No account found with this email address');
          } else if (result.error) {
            setError(result.error);
          } else {
            setError('');
          }
        });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [email, authMethod]);

  /**
   * Handles the submission of the OTP (One-Time Password) form.
   *
   * This function is triggered when the OTP form is submitted. It prevents the default form submission behavior,
   * sets the loading state, and attempts to redirect the user to the email callback URL with the provided email and OTP code.
   *
   * If the NEXTAUTH_URL environment variable is set, it will be included as a callback URL parameter.
   *
   * In case of an error during the redirection process, it logs the error, sets an error message, and clears the email state.
   * The loading state is reset to false after the process completes.
   *
   * @param {React.FormEvent} e - The form submission event.
   */
  const handleOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      window.location.href = `/api/auth/callback/email?email=${encodeURIComponent(
        email.toLowerCase()
      )}&token=${OTPCode}${process.env.NEXTAUTH_URL ? `&callbackUrl=${process.env.NEXTAUTH_URL}` : ''}`;
    } catch (err) {
      console.error('Sign-in failed', err);
      setError('An error occurred while sending the otp code');
      setEmail('');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles the form submission for the sign-in process.
   *
   * This function performs the following steps:
   * 1. Prevents the default form submission behavior.
   * 2. Sets the loading state to true and clears any previous error or success messages.
   * 3. Attempts to fetch the user data from the server using the provided email.
   * 4. If the user is found, attempts to sign in using the email.
   * 5. Sets appropriate error or success messages based on the result of the sign-in attempt.
   * 6. Handles any errors that occur during the fetch or sign-in process.
   * 7. Resets the loading state once the process is complete.
   *
   * @param {React.FormEvent} e - The form submission event.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await signIn('email', {
        redirect: false,
        email: email.toLowerCase(),
      });
      console.log('sign in result ==>', result);

      if (result?.error) {
        setError(result.error);
        setEmail('');
      } else if (result?.ok) {
        setSuccess('A OTP Code has been sent to your email address.');
        setShowOTP(true);
      }
    } catch (err) {
      console.error('Sign-in failed', err);
      setError('An error occurred while sending the OTP Code');
      setEmail('');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.status === 'authenticated') {
      router.push('/');
    }
  }, [session, router]);

  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isCreatingPassword) {
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          return;
        }

        if (password.length < 8) {
          setError('Password must be at least 8 characters long');
          return;
        }

        // Create password for existing user
        const createPasswordResponse = await createPassword(email, password);

        if (!createPasswordResponse.success) {
          throw new Error(createPasswordResponse.error || 'Failed to create password');
        }
      }

      // Sign in with credentials
      const result = await signIn('credentials', {
        redirect: false,
        email: email.toLowerCase(),
        password,
      });

      if (result?.error) {
        setError(result.error);
      } else if (result?.ok) {
        router.push('/');
      }
    } catch (err) {
      console.error('Sign-in error:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    setError(null);
    setSuccess(null);
  };

  if (session?.status === 'authenticated') {
    return null;
  }

  return (
    <div className='flex min-h-screen w-full' suppressHydrationWarning>
      {/* Left side - Platform branding */}
      <div className='hidden lg:flex w-1/2 bg-gray-100 flex-col items-center'>
        <div className='w-full max-w-md'>
          <h1 className='text-3xl font-bold mb-0'>
            <Image
              src='/cmmc-ceic-east.png'
              alt='CMMC CEIC EAST'
              width={240}
              height={80}
              className='mb-0'
            />
            Welcome to CEIC™ EAST
          </h1>
          {/* <p className='text-xl text-gray-600'>Connect with your favorite brands and services.</p> */}
        </div>
      </div>

      {/* Right side - Client branding and login form */}
      <div className='min-h-[66vh] lg:h-screen w-full lg:w-1/2 bg-[#152f48] flex flex-col justify-center items-center'>
        <div className='w-full max-w-md px-8 mb-12'>
          <div className='flex justify-center mb-8'>
            <Image
              src='/express-connect-logo.png'
              alt='Express Connect Logo'
              width={240 * 0.8}
              height={80 * 0.8}
              className='mb-2'
            />
          </div>

          <Tabs
            value={authMethod}
            onValueChange={(v) => setAuthMethod(v as 'otp' | 'password')}
            className='w-full'>
            <TabsList className='grid w-full grid-cols-2 mb-6'>
              <TabsTrigger
                value='otp'
                className='text-black data-[state=active]:bg-[#152f48] data-[state=active]:text-white'>
                Sign in with OTP
              </TabsTrigger>
              <TabsTrigger
                value='password'
                className='text-black data-[state=active]:bg-[#152f48] data-[state=active]:text-white'>
                Sign in with Password
              </TabsTrigger>
            </TabsList>

            <TabsContent value='otp'>
              {error && (
                <Alert variant='destructive' className='mb-6'>
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{getErrorMessage(error)}</AlertDescription>
                </Alert>
              )}
              {success && (
                <Alert variant='default' className='mb-6'>
                  <Mail className='h-4 w-4' />
                  <AlertTitle>Check your email</AlertTitle>
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}
              {!showOTP && (
                <form onSubmit={handleSubmit} className='space-y-6'>
                  <div className='space-y-2'>
                    <Label htmlFor='email' className='text-white'>
                      Email
                    </Label>
                    <Input
                      id='email'
                      type='email'
                      placeholder='me@example.com'
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className='bg-white'
                      disabled={loading}
                    />
                  </div>
                  <Button
                    type='submit'
                    className='w-full bg-white text-[#152f48] hover:bg-gray-200'
                    disabled={loading}>
                    {loading ? 'Sending...' : 'Send OTP Code'}
                  </Button>
                </form>
              )}

              {showOTP && (
                <form onSubmit={handleOTPSubmit} className='space-y-6'>
                  <div className='space-y-2'>
                    <Label htmlFor='email' className='text-white'>
                      CODE
                    </Label>
                    <Input
                      id='otp_code'
                      type='text'
                      placeholder='ABC123'
                      required
                      value={OTPCode}
                      onChange={(e) => setOTPCode(e.target.value)}
                      className='bg-white'
                      disabled={loading}
                    />
                  </div>
                  <Button
                    type='submit'
                    className='w-full bg-white text-[#152f48] hover:bg-gray-200'
                    disabled={loading}>
                    {loading ? 'Sending...' : 'Submit Code'}
                  </Button>
                </form>
              )}
            </TabsContent>

            <TabsContent value='password'>
              <form onSubmit={handlePasswordSignIn} className='space-y-6'>
                <div className='space-y-2'>
                  <Label htmlFor='email' className='text-white'>
                    Email
                  </Label>
                  <Input
                    id='email'
                    type='email'
                    value={email}
                    onChange={(e) => handleEmailChange(e)}
                    required
                    className='bg-white'
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='password' className='text-white'>
                    Password
                  </Label>
                  {!isCreatingPassword && (
                    <Link
                      href='/auth/forgot-password'
                      className='text-sm text-gray-400 hover:text-gray-400 float-right'>
                      Forgot password?
                    </Link>
                  )}
                  <Input
                    id='password'
                    type='password'
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className='bg-white'
                  />
                </div>

                <div className='space-y-2'>
                  {isCreatingPassword && (
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
                      />
                    </div>
                  )}
                </div>

                {error && (
                  <div className='mt-2'>
                    <Alert variant='destructive'>
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  </div>
                )}

                <Button
                  type='submit'
                  className='w-full bg-white text-[#152f48] hover:bg-gray-200'
                  disabled={loading}>
                  {loading
                    ? 'Please wait...'
                    : isCreatingPassword
                      ? 'Create Password & Sign In'
                      : 'Sign In'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className='mt-6 mb-6'>
            <div className='text-white text-center text-sm mb-2'>
              Didn't sign up for Express Connect? It's not too late!
            </div>
            <div className='flex justify-center mb-2'>
              <Image
                src='/images/express-connect-walkin.png'
                alt='Walk In Icon'
                width={232}
                height={232}
              />
            </div>
            <div className='text-white text-center text-sm'>
              Find the Walk-in Desk at the conference and sign up for any available host slots right
              at the conference. Review the list of Express Connect hosts to see your host
              opportunities.
            </div>
          </div>
          <p className='mt-6 text-sm text-center text-gray-300'>
            By logging in, you agree to our{' '}
            <Link
              href='https://forummakers.com/legal/express-connect-terms-of-service/'
              className='p-0 h-auto font-normal text-sm text-white hover:text-gray-200'>
              Terms of Service
            </Link>
            <Link
              href='https://forummakers.com/legal/express-connect-privacy-policy/'
              className='p-0 h-auto font-normal text-sm text-white hover:text-gray-200 ml-4'>
              Privacy Policy
            </Link>
          </p>
        </div>

        {/* Mobile-only bottom section */}
        <div className='lg:hidden min-h-[34vh] w-full bg-white flex flex-col items-center'>
          {/* Add your mobile-specific content here */}
          <div className='w-full max-w-md px-8 border-4 border-white'>
            <div className='flex justify-center mb-8 flex-col items-center'>
              <Image
                src='/cmmc-ceic-east.png'
                alt='CMMC CEIC EAST'
                width={240 * 0.6}
                height={80 * 0.6}
                className='mb-2'
              />
              <div className='text-sm mb-2'>
                this is where the content will go about seeing the host information and it will
                displaye a completely different view than the desktop view. page
              </div>
              <Button
                className='bg-white text-[#152f48] hover:bg-gray-200 border-gray-300 border'
                onClick={() => {
                  router.push('/auth/host-information');
                }}>
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Keep the existing getErrorMessage function
const getErrorMessage = (error: string) => {
  console.log('getErrorMessage ==>', error);
  switch (error) {
    case 'AccessDenied':
      return 'You are not authorized to sign in. Please contact support.';
    default:
      return 'An unknown error occurred. Please try again.';
  }
};

export default SignInPage;
