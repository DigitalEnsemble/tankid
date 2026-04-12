import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('API endpoint called');
    const body = await request.json();
    console.log('Request body:', body);
    const { userType, firstName, lastName, email, phone, company, location } = body;

    // Validate required fields
    if (!firstName || !lastName || !email || !userType) {
      console.log('Validation failed - missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    console.log('Validation passed');

    // Format the email content
    const subject = `TankID Early Access Request - ${firstName} ${lastName}`;
    const emailBody = `
New TankID Early Access Request

User Type: ${userType}
Name: ${firstName} ${lastName}
Email: ${email}
Phone: ${phone || 'Not provided'}
Company: ${company || 'Not provided'}
Location: ${location || 'Not provided'}

Submitted at: ${new Date().toLocaleString('en-US', { 
  timeZone: 'America/Chicago',
  year: 'numeric',
  month: '2-digit', 
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit'
})} CDT
    `.trim();

    // For now, we'll use a simple email service approach
    // Using Resend (you'll need to set RESEND_API_KEY environment variable)
    const resendApiKey = process.env.RESEND_API_KEY;
    console.log('Resend API key exists:', !!resendApiKey);
    
    if (resendApiKey) {
      console.log('Attempting to send email via Resend...');
      // Send email via Resend
      const emailData = {
        from: 'TankID Website <noreply@tankid.io>',
        to: ['casey.wells@tankid.io'],
        subject: subject,
        text: emailBody,
        html: emailBody.replace(/\n/g, '<br>'),
        reply_to: 'casey.wells@tankid.io'
      };

      console.log('Email data prepared:', emailData);
      
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData),
      });
      
      console.log('Resend response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Resend API error:', response.status, errorText);
        throw new Error(`Resend API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Email sent successfully via Resend:', result);
    } else {
      // Fallback: Log to console when API key is missing
      console.warn('RESEND_API_KEY not found in environment variables!');
      console.log('=== EARLY ACCESS FORM SUBMISSION (NO EMAIL SENT) ===');
      console.log(subject);
      console.log(emailBody);
      console.log('=====================================================');
      
      // For development, we'll still return success
      // In production, you might want to fail here
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Application submitted successfully' 
    });

  } catch (error) {
    console.error('Error processing early access submission:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: 'Failed to submit application' },
      { status: 500 }
    );
  }
}