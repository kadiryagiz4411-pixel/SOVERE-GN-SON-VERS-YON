import { NextResponse } from 'next/server';

function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-extension-id',
    'Access-Control-Max-Age': '86400',
  };
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: getCorsHeaders(),
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    return NextResponse.json(
      {
        success: true,
        message: 'Parse DOM API active',
        data: body
      },
      { headers: getCorsHeaders() }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Server Error' },
      { status: 500, headers: getCorsHeaders() }
    );
  }
}