// app/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { UserRole } from '@prisma/client';

export async function middleware(req: NextRequest) {
  const token = await getToken({ req });
  const currentPath = req.nextUrl.pathname;

  // admin can access all routes
  if (token && token.role === UserRole.ADMIN) {
    return NextResponse.next();
  }

  // Allow unauthenticated access to authentication-related API routes
  if (currentPath.startsWith('/api/auth/') || currentPath.startsWith('/api/users/')) {
    return NextResponse.next(); // Allow unauthenticated access to authentication-related API routes
  }

  // Separate handling for other API routes
  if (currentPath.startsWith('/api/')) {
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // For API routes, we'll just check if the user is authenticated
    // You can add more specific API route checks here if needed
    return NextResponse.next();
  }

  // Check authentication for root path
  if (currentPath === '/') {
    if (token) {
      switch (token.role) {
        case UserRole.ADMIN:
          return NextResponse.redirect(new URL('/admin/me', req.nextUrl.origin));
        case UserRole.HOST_ADMIN:
        case UserRole.HOST_TEAM_MEMBER:
          return NextResponse.redirect(
            new URL(`/host/${token.hostId}/dashboard`, req.nextUrl.origin)
          );
        case UserRole.ATTENDEE:
        case UserRole.ATTENDEE_ADMIN:
          return NextResponse.redirect(
            new URL(`/attendee/${token.attendeeId}/dashboard`, req.nextUrl.origin)
          );
      }
    }
    // Redirect unauthenticated users to the sign-in page
    return NextResponse.redirect(new URL('/auth/signin', req.nextUrl.origin));
  }

  // Define routes that require authentication, allow all other routes
  const protectedPaths = ['/host', '/attendee', '/admin'];
  if (!protectedPaths.some((path) => currentPath.startsWith(path))) {
    return NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(new URL('/auth/signin', req.nextUrl.origin));
  }

  let redirectUrl: string | null = null;

  switch (token.role) {
    case UserRole.ADMIN:
      // Admin has access to all routes
      return NextResponse.next();
    case UserRole.HOST_TEAM_MEMBER:
    case UserRole.HOST_ADMIN:
      if (currentPath.startsWith('/host/')) {
        const pathParts = currentPath.split('/');
        const urlHostId = pathParts[2];
        if (urlHostId === token.hostId) {
          return NextResponse.next();
        }
      }
      redirectUrl = `/host/${token.hostId}/dashboard`;
      break;
    case UserRole.ATTENDEE:
    case UserRole.ATTENDEE_ADMIN:
      if (currentPath.startsWith('/attendee/')) {
        const pathParts = currentPath.split('/');
        const urlAttendeeId = pathParts[2];
        if (urlAttendeeId === token.attendeeId) {
          return NextResponse.next();
        }
      }
      redirectUrl = `/attendee/${token.attendeeId}/dashboard`;
      break;
    default:
      // Redirect to a default page or show an error for unhandled roles
      redirectUrl = '/auth/unauthorized';
      break;
  }

  if (redirectUrl) {
    // console.log('redirectUrl', redirectUrl);
    return NextResponse.redirect(new URL(redirectUrl, req.nextUrl.origin));
  }

  // console.log('middleware', req.nextUrl.pathname);
  // console.log('token', token);
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
    '/host/:path*',
    '/attendee/:path*',
    '/admin/:path*',
    '/',
    '/api/:path*',
  ],
};
