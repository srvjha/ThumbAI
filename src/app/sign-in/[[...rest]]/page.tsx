import type { Metadata } from 'next';
import { SignIn } from '@clerk/nextjs';
import { AuthShell, authAppearance } from '@/components/auth/AuthShell';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to ThumbAI to generate thumbnails and blog covers.',
};

export default function SignInPage() {
  return (
    <AuthShell
      heading='Welcome back'
      subheading='Pick up where you left off. Your generations are waiting.'
    >
      <SignIn
        appearance={authAppearance}
        routing='path'
        path='/sign-in'
        // Leading slash matters: 'sign-up' is relative, so Clerk linked to
        // /sign-in/sign-up, which does not exist.
        signUpUrl='/sign-up'
        forceRedirectUrl='/studio/text-to-image'
      />
    </AuthShell>
  );
}
