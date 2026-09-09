import type { Metadata } from 'next';
import { SignUp } from '@clerk/nextjs';
import { AuthShell } from '@/components/auth/AuthShell';

export const metadata: Metadata = {
  title: 'Create an account',
  description:
    'Create a ThumbAI account and get 3 free thumbnails to start with.',
};

export default function SignUpPage() {
  return (
    <AuthShell
      heading='Create your account'
      subheading='Three thumbnails on the house. No card needed.'
    >
      <SignUp
        routing='path'
        path='/sign-up'
        signInUrl='/sign-in'
        forceRedirectUrl='/studio/text-to-image'
      />
    </AuthShell>
  );
}
