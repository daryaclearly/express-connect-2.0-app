'use server';

import { Resend } from 'resend';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { hash } from 'bcryptjs';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import prisma from '@/lib/prisma';

export const checkUserStatus = async (email: string) => {
  const user = await prisma.user.findUnique({
    where: {
      email: email.toLowerCase(),
    },
  });

  const exists = user ? true : false;
  const hasPassword = user?.hashedPassword ? true : false;

  if (!exists) {
    return { exists: false, error: 'No account found with this email address' };
  }

  if (!hasPassword) {
    return { exists, hasPassword: false };
  }

  return { exists, hasPassword };
};

export const createPassword = async (email: string, password: string) => {
  const user = await prisma.user.findUnique({
    where: {
      email: email.toLowerCase(),
    },
  });

  if (!user) {
    return { error: 'No account found with this email address', success: false };
  }

  const hashedPassword = await hash(password, 12);

  await prisma.user.update({
    where: { email: email.toLowerCase() },
    data: { hashedPassword, passwordSet: true },
  });

  return { success: true, error: null };
};

// ==========================================

const resend = new Resend(process.env.NEXTAUTH_RESEND_KEY);

// Validation schemas
const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const resetPasswordSchema = z.object({
  token: z.string().uuid('Invalid reset token'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type ActionResponse = {
  success: boolean;
  error?: string;
};

export async function initiatePasswordReset(email: string): Promise<ActionResponse> {
  try {
    // Validate input
    const parsed = forgotPasswordSchema.parse({ email });

    const user = await prisma.user.findUnique({
      where: { email: parsed.email.toLowerCase() },
    });

    if (!user) {
      // Return success even if user doesn't exist (security best practice)
      return { success: true };
    }

    // Generate reset token and expiry
    const resetToken = randomUUID();
    const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Save reset token to user
    await prisma.user.update({
      where: { email: parsed.email.toLowerCase() },
      data: {
        resetToken,
        resetTokenExpiry,
        passwordSet: false,
      },
    });

    // Read email template
    const templatePath = resolve(process.cwd(), 'public', 'reset-password-email.html');
    let emailTemplate = readFileSync(templatePath, 'utf8');

    // Replace placeholders
    const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`;
    emailTemplate = emailTemplate
      .replace('{{RESET_LINK}}', resetUrl)
      .replace('{{FIRST_NAME}}', user.firstName || '')
      .replace('{{LAST_NAME}}', user.lastName || '');

    // Send email
    await resend.emails.send({
      from: `CEIC EAST <${process.env.NEXTAUTH_RESEND_EMAIL_FROM}>`,
      to: parsed.email.toLowerCase(),
      subject: 'Reset Your Password',
      html: emailTemplate,
    });

    return { success: true };
  } catch (error) {
    console.error('Password reset error:', error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { success: false, error: 'Failed to process request' };
  }
}

export async function resetPassword(token: string, password: string): Promise<ActionResponse> {
  try {
    // Validate input
    const parsed = resetPasswordSchema.parse({ token, password });

    const user = await prisma.user.findFirst({
      where: {
        resetToken: parsed.token,
        resetTokenExpiry: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      return { success: false, error: 'Invalid or expired reset token' };
    }

    const hashedPassword = await hash(parsed.password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
        passwordSet: true,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Password reset error:', error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { success: false, error: 'Failed to reset password' };
  }
}
