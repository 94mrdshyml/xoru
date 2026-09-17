import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const firstName = body.firstName || 'User';
  const lastName = body.lastName || '';
  const email = body.email || '';
  const workspaceName = `${firstName}'s Workspace`;
  const authHeader = request.headers.get('Authorization') || '';

  try {
    const backendUrl = process.env.BACKEND_API_URL || 'https://xoru-backend.mridu.workers.dev';

    // Call Hono backend to ensure user and automatic workspace are provisioned in Neon DB
    const res = await fetch(`${backendUrl}/api/v1/workspaces/onboard`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
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
  return NextResponse.redirect(new URL('/onboarding', process.env.NEXT_PUBLIC_APP_URL || 'https://xoru-frontend.pages.dev'));
}
