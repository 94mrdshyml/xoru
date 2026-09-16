import { currentUser, auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const user = await currentUser();
  const { getToken } = await auth();

  if (!user) {
    return NextResponse.redirect(new URL('/sign-in', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
  }

  const firstName = user.firstName || 'User';
  const lastName = user.lastName || '';
  const email = user.emailAddresses[0]?.emailAddress || '';
  const workspaceName = `${firstName}'s Workspace`;

  try {
    const token = await getToken();
    const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:8787';

    // Call Python backend to ensure user and automatic workspace are provisioned in Neon DB
    await fetch(`${backendUrl}/api/v1/workspaces/onboard`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        first_name: firstName,
        last_name: lastName,
        email: email,
        workspace_name: workspaceName,
      }),
    });
  } catch (error) {
    console.error('Onboarding workspace creation error:', error);
  }

  // Redirect to dashboard
  return NextResponse.redirect(new URL('/dashboard', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
}
