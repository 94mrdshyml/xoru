import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Public routes that do not require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/public(.*)',
  '/health',
]);

const publishableKey =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  'pk_test_cG9ldGljLXByaW1hdGUtMzI4NC5jbGVyay5hY2NvdW50cy5kZXYk';

const secretKey =
  process.env.CLERK_SECRET_KEY ||
  'sk_test_mock_secret_key_for_xoru_development_purposes_only';

const handleClerk = clerkMiddleware(
  async (auth, request) => {
    if (!isPublicRoute(request)) {
      await auth.protect();
    }
  },
  {
    publishableKey,
    secretKey,
  }
);

export default async function middleware(request: NextRequest, event: any) {
  try {
    return await handleClerk(request, event);
  } catch (error) {
    console.error('Clerk middleware error on edge:', error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};

