import { PrismaAdapter } from '@next-auth/prisma-adapter';
import EmailProvider from 'next-auth/providers/email';
import CredentialsProvider from 'next-auth/providers/credentials';
import { Resend } from 'resend';
import type { DefaultSession, SessionStrategy, JWT, Session } from 'next-auth'; // Import SessionStrategy
import { Account, User } from '@prisma/client';
import { DefaultJWT } from 'next-auth/jwt';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { randomUUID } from 'crypto';
import { compare } from 'bcryptjs'; // Changed from bcrypt to bcryptjs
import prisma from './lib/prisma';

const resend = new Resend(process.env.NEXTAUTH_RESEND_KEY);

/**
 * Check if the environment variables are set. If not, throw an error.
 *
 * @throws {Error}
 */
if (!process.env.NEXTAUTH_RESEND_EMAIL_FROM) {
  throw new Error('NEXTAUTH_RESEND_EMAIL_FROM environment variable is not set');
}

if (!process.env.NEXTAUTH_URL) {
  throw new Error('NEXTAUTH_URL environment variable is not set');
}

if (!process.env.EMAIL_SUPPORT_FROM) {
  throw new Error('EMAIL_SUPPORT_FROM environment variable is not set');
}

/**
 * Get the environment variables.
 */
const EMAIL_SUPPORT_FROM = process.env.EMAIL_SUPPORT_FROM;
const NEXTAUTH_URL = process.env.NEXTAUTH_URL;

// Define custom token and session types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: string;
      hostId: string;
      attendeeId: string;
      name: string;
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    role: string;
    hostid: string;
    attendeeCompanyId: string;
  }

  interface JWT extends DefaultJWT {
    id?: string;
    role?: string;
    name?: string;
    hostId?: string;
    attendeeId?: string;
  }
}

/**
 * Sends a verification email with a magic link to the specified email address.
 *
 * @param {Object} params - The parameters for the verification request.
 * @param {string} params.identifier - The email address to send the verification link to.
 * @param {string} params.url - The magic link URL to be included in the email.
 * @param {any} params.provider - The provider information (not used in the function).
 *
 * @returns {Promise<void>} - A promise that resolves when the email has been sent.
 *
 * @throws {Error} - Throws an error if there is an issue sending the email.
 */
const sendVerificationRequestMagicLink = async ({ identifier: email, url, provider }: any) => {
  try {
    // Read the HTML template
    const templatePath = resolve(process.cwd(), 'public', 'magic-link-email.html');
    let emailTemplate = readFileSync(templatePath, 'utf8');

    // Replace the placeholder with the actual magic link URL
    emailTemplate = emailTemplate.replace('{{MAGIC_LINK_URL}}', url);

    // Generate a unique Message-ID
    const messageId = `<${randomUUID()}>`;

    const response = await resend.emails.send({
      from: `${process.env.NEXTAUTH_RESEND_EMAIL_FROM}`, // Set your domain
      to: email,
      subject: 'Login to Express Connect',
      html: emailTemplate,
      headers: {
        'Message-ID': messageId,
      },
    });
    console.log('email send response', response);
  } catch (error) {
    console.error('Error sending email', error);
  }
};

class UserNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserNotFoundError';
  }
}

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    EmailProvider({
      generateVerificationToken: async () => {
        const token = await generateAuthtoken();
        return token;
      },
      sendVerificationRequest: async ({ identifier: email, token, url }) => {
        try {
          // Fetch user information from the database
          const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
            select: { firstName: true, lastName: true },
          });

          if (!user) {
            console.log('user not found in system ', email);
            return;
          }

          // Read the HTML template
          const templatePath = resolve(process.cwd(), 'public', 'otp-email-alt.html');
          let emailTemplate = readFileSync(templatePath, 'utf8');

          // Replace the placeholders with the actual values
          emailTemplate = emailTemplate.replace('{{OTP_CODE}}', token);
          emailTemplate = emailTemplate.replace('{{FIRST_NAME}}', user.firstName || '');
          emailTemplate = emailTemplate.replace('{{LAST_NAME}}', user.lastName || '');

          emailTemplate = emailTemplate.replaceAll('{{EMAIL_SUPPORT_FROM}}', EMAIL_SUPPORT_FROM);
          emailTemplate = emailTemplate.replaceAll('{{NEXTAUTH_URL}}', NEXTAUTH_URL);

          // Generate a unique Message-ID
          const messageId = `<${randomUUID()}>`;

          const response = await resend.emails.send({
            from: `CEIC EAST <${process.env.NEXTAUTH_RESEND_EMAIL_FROM}>`, // Set your domain
            to: email.toLowerCase(),
            subject: 'Your CEIC EAST Sign-in Code',
            html: emailTemplate,
            headers: {
              'Message-ID': messageId,
            },
          });
          console.log('email send response', response);

          if (response.error) {
            throw new Error('Error sending email ' + response.error.message);
          }

          // if there was no error, we will wipe any password related data from the user
          // so that they can only login with the magic link. They will need to set a password
          // in the system to be able to login with email/password
          await prisma.user.update({
            where: { email: email.toLowerCase() },
            data: {
              hashedPassword: null,
              passwordSet: false,
            },
          });
        } catch (error) {
          console.error('Error in sendVerificationRequest:', error);
          // Instead of re-throwing, we'll return false to indicate failure
          return;
        }
      },
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please enter your email and password');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
          select: {
            id: true,
            email: true,
            hashedPassword: true,
            passwordSet: true,
            role: true,
            hostid: true,
            attendeeCompanyId: true,
            firstName: true,
            lastName: true,
          },
        });

        if (!user) {
          throw new Error('No user found with this email address');
        }

        if (!user.hashedPassword) {
          throw new Error('Please use magic link login or set up your password first');
        }

        const isPasswordValid = await compare(credentials.password, user.hashedPassword);

        if (!isPasswordValid) {
          throw new Error('Invalid password');
        }

        // Map Prisma user to NextAuth User interface
        console.log('user found in system ', user);
        return {
          id: user.id,
          email: user.email,
          role: user.role,
          hostid: user.hostid || '',
          attendeeCompanyId: user.attendeeCompanyId || '',
          firstName: user.firstName || '',
          lastName: user.lastName || '',
        };
      },
    }),
  ],
  callbacks: {
    async signIn({
      user,
      account,
      email,
    }: {
      user: User | null;
      account: Account | null;
      email: string | null;
    }) {
      try {
        const existingUser = await prisma.user.findUnique({
          where: {
            email: user?.email.toLowerCase(),
          },
          select: {
            id: true,
            role: true,
            hostid: true,
            attendeeCompanyId: true,
            host: true,
            attendeeCompany: true,
            firstName: true,
            lastName: true,
          },
        });

        if (!existingUser) {
          console.log('signin callback, user not found in system ', user?.email);
          return false; // This will trigger the error page with a generic error message
        }

        return true;
      } catch (error) {
        console.error('Error in signIn callback:', error);
        return false; // This will trigger the error page with a generic error message
      }
    },
    async authorize({ user }: { user: User }) {
      console.log('authorize ==>', user);
      return user;
    },
    async jwt({ token, user }: { token: JWT; user: User }) {
      if (user) {
        return {
          ...token,
          id: user.id,
          role: user.role,
          hostId: user.hostid || '',
          attendeeId: user.attendeeCompanyId || '',
          name: `${user.firstName || ''}`.trim(),
          email: user.email,
        };
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      session.user = {
        id: token.id || '',
        role: token.role || '',
        hostId: token.hostId || '',
        attendeeId: token.attendeeId || '',
        name: token.name || '',
        email: token.email,
      };
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin', // Custom sign-in page
    verifyRequest: '/auth/verify-request', // Custom verify page after email is sent
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt' as SessionStrategy, // Use SessionStrategy.JWT instead of 'jwt'
  },
};
/**
 * Generates a random authentication token.
 *
 * The token consists of 8 characters randomly selected from
 * uppercase letters, lowercase letters, and digits.
 *
 * @returns {Promise<string>} A promise that resolves to the generated token.
 */
const generateAuthtoken = async () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 8; i++) {
    token += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return token;
};
