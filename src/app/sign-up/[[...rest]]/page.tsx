import type { Metadata } from 'next';
import { SignUp } from '@clerk/nextjs';
import { AuthShell, authAppearance } from '@/components/auth/AuthShell';

export const metadata: Metadata = {
  title: 'Create an account',
  description: 'Create a ThumbAI account and get 3 free credits to start with.',
};

export default function SignUpPage() {
  return (
    <AuthShell
      heading='Create your account'
      subheading='Three free credits to start, enough for three draft thumbnails. No card needed.'
    >
      <SignUp
        appearance={authAppearance}
        routing='path'
        path='/sign-up'
        signInUrl='/sign-in'
        forceRedirectUrl='/studio/text-to-image'
      />
    </AuthShell>
  );
}
