'use client';

import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className='flex justify-center items-center h-screen md:min-h-[calc(100vh+70px)]'>
      <SignUp routing='path' path='/sign-up' signInUrl='sign-in' />
    </div>
  );
}
