import { currentUser, auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(request: Request) {
  const { userId, getToken } = await auth();
  const user = await currentUser();

  if (!userId || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const firstName = body.firstName || user.firstName || 'User';
  const lastName = body.lastName || user.lastName || '';
  const email = body.email || user.emailAddresses[0]?.emailAddress || '';
  const workspaceName = `${firstName}'s Workspace`;

  try {
    const token = await getToken();
    const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:8787';

    // Call Python backend to ensure user and automatic workspace are provisioned in Neon DB
    const res = await fetch(`${backendUrl}/api/v1/workspaces/onboard`, {
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

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error('Backend onboarding failed:', errData);
      return NextResponse.json({ error: 'Backend onboarding failed', detail: errData }, { status: 500 });
    }

    return NextResponse.json({ success: true, workspaceName });
  } catch (error: any) {
    console.error('Onboarding workspace creation error:', error);
    return NextResponse.json({ error: error.message || 'Onboarding error' }, { status: 500 });
  }
}

export async function GET() {
  // Direct GET request from Clerk redirect -> redirect to /onboarding page for client token hydration
  return NextResponse.redirect(new URL('/onboarding', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
}
