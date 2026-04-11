import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userType, firstName, lastName, email, phone, company, location } = body;

    // Validate required fields
    if (!firstName || !lastName || !email || !userType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

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
    
    if (resendApiKey) {
      // Send email via Resend
      const emailData = {
        from: 'TankID Website <noreply@tankid.io>',
        to: ['casey.wells@tankid.io'],
        subject: subject,
        text: emailBody,
        html: emailBody.replace(/\n/g, '<br>')
      };

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData),
      });

      if (!response.ok) {
        throw new Error(`Resend API error: ${response.status}`);
      }

      const result = await response.json();
      console.log('Email sent via Resend:', result);
    } else {
      // Fallback: Log to console (you can replace this with another email service)
      console.log('=== EARLY ACCESS FORM SUBMISSION ===');
      console.log(subject);
      console.log(emailBody);
      console.log('=====================================');
      
      // For development, we'll still return success
      // In production, you'd want to fail here or use an alternative service
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Application submitted successfully' 
    });

  } catch (error) {
    console.error('Error processing early access submission:', error);
    return NextResponse.json(
      { error: 'Failed to submit application' },
      { status: 500 }
    );
  }
}