import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { STARTER_COOKIE, starterPrompt } from '@/config/starters';

const isProtectedRoute = createRouteMatcher([
  '/studio(.*)',
  '/dashboard(.*)',
  '/billing(.*)',
  '/profile(.*)',
  '/admin(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    try {
      await auth.protect();
    } catch (err) {
      // If not authenticated, redirect instead of throwing
      const signIn = NextResponse.redirect(new URL('/sign-in', req.url));
      // A prompt card was clicked while signed out: the studio picks it up
      // from this cookie after sign-in or sign-up, whichever steps they take.
      const starter = req.nextUrl.searchParams.get('starter');
      if (starter && starterPrompt(starter)) {
        signIn.cookies.set(STARTER_COOKIE, starter, {
          maxAge: 60 * 60,
          path: '/',
          sameSite: 'lax',
        });
      }
      return signIn;
    }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
