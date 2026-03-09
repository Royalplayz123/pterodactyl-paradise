import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendEmailRequest {
  action: 'send_email' | 'test_smtp';
  to?: string;
  subject?: string;
  html?: string;
  text?: string;
  smtp_config: {
    host: string;
    port: number;
    username: string;
    password: string;
    from_email: string;
    from_name: string;
    secure?: boolean;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: SendEmailRequest = await req.json();
    const { action, smtp_config } = body;

    if (!smtp_config || !smtp_config.host || !smtp_config.username || !smtp_config.password) {
      return new Response(
        JSON.stringify({ error: 'SMTP configuration is incomplete' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Configure SMTP client
    const client = new SMTPClient({
      connection: {
        hostname: smtp_config.host,
        port: smtp_config.port || 587,
        tls: smtp_config.port === 465,
        auth: {
          username: smtp_config.username,
          password: smtp_config.password,
        },
      },
    });

    if (action === 'test_smtp') {
      // Test connection by sending a test email
      await client.send({
        from: `${smtp_config.from_name} <${smtp_config.from_email}>`,
        to: smtp_config.from_email,
        subject: 'SMTP Test - Connection Successful',
        content: 'This is a test email to verify your SMTP configuration is working correctly.',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #10b981;">✓ SMTP Configuration Successful</h2>
            <p>Your email notification system is now configured and working.</p>
            <p style="color: #6b7280; font-size: 12px;">This is an automated test message.</p>
          </div>
        `,
      });

      await client.close();

      return new Response(
        JSON.stringify({ success: true, message: 'Test email sent successfully!' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'send_email') {
      const { to, subject, html, text } = body;

      if (!to || !subject) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: to, subject' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await client.send({
        from: `${smtp_config.from_name} <${smtp_config.from_email}>`,
        to,
        subject,
        content: text || '',
        html: html || text || '',
      });

      await client.close();

      return new Response(
        JSON.stringify({ success: true, message: 'Email sent successfully!' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Email error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to send email' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});