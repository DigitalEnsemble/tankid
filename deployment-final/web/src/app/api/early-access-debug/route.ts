import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('Debug API endpoint called');
    const body = await request.json();
    console.log('Request body received:', body);
    
    // Just return success without trying to send email
    return NextResponse.json({ 
      success: true, 
      message: 'Debug test successful',
      receivedData: body,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json(
      { error: 'Debug API failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}