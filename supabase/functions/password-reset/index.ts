import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PasswordResetRequest {
  action: 'request_reset' | 'verify_token' | 'reset_password';
  email?: string;
  token?: string;
  new_password?: string;
  site_url?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: PasswordResetRequest = await req.json();
    const { action } = body;

    if (action === 'request_reset') {
      const { email, site_url } = body;
      
      if (!email) {
        return new Response(
          JSON.stringify({ error: 'Email is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if user exists
      const { data: userData } = await supabase.auth.admin.listUsers();
      const user = userData?.users?.find(u => u.email === email);
      
      // Always return success to prevent email enumeration
      if (!user) {
        return new Response(
          JSON.stringify({ success: true, message: 'If an account exists, a reset email has been sent.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get user profile for username
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();

      // Generate secure token
      const token = crypto.randomUUID() + '-' + crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Store token
      await supabase
        .from('password_reset_tokens')
        .insert({
          user_id: user.id,
          token,
          expires_at: expiresAt.toISOString(),
        });

      // Get SMTP config
      const { data: smtpData } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'smtp_config')
        .single();

      const smtpConfig = smtpData?.value as any;

      if (!smtpConfig?.host || !smtpConfig?.username || !smtpConfig?.password) {
        // Fall back to Supabase auth if SMTP not configured
        await supabase.auth.admin.generateLink({
          type: 'recovery',
          email,
          options: { redirectTo: `${site_url}/reset-password` }
        });
        
        return new Response(
          JSON.stringify({ success: true, message: 'Reset email sent via default system.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Send email via SMTP
      const resetLink = `${site_url}/reset-password?token=${token}`;
      
      const client = new SMTPClient({
        connection: {
          hostname: smtpConfig.host,
          port: smtpConfig.port || 587,
          tls: smtpConfig.port === 465,
          auth: {
            username: smtpConfig.username,
            password: smtpConfig.password,
          },
        },
      });

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🔑 Password Reset</h1>
          </div>
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              Hello${profile?.username ? ` <strong>${profile.username}</strong>` : ''},
            </p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              We received a request to reset your password. Click the button below to set a new password:
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Reset Password
              </a>
            </div>
            <p style="color: #6b7280; font-size: 14px;">
              This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.
            </p>
            <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 20px;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                If the button doesn't work, copy and paste this link:<br/>
                <a href="${resetLink}" style="color: #6366f1;">${resetLink}</a>
              </p>
            </div>
          </div>
        </div>
      `;

      await client.send({
        from: `${smtpConfig.from_name} <${smtpConfig.from_email}>`,
        to: email,
        subject: 'Reset Your Password',
        content: 'Reset your password by clicking the link in this email.',
        html: emailHtml,
      });

      await client.close();

      return new Response(
        JSON.stringify({ success: true, message: 'Password reset email sent!' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'verify_token') {
      const { token } = body;
      
      if (!token) {
        return new Response(
          JSON.stringify({ valid: false, error: 'Token is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: tokenData } = await supabase
        .from('password_reset_tokens')
        .select('*')
        .eq('token', token)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .single();

      return new Response(
        JSON.stringify({ valid: !!tokenData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'reset_password') {
      const { token, new_password } = body;
      
      if (!token || !new_password) {
        return new Response(
          JSON.stringify({ error: 'Token and new password are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify token
      const { data: tokenData } = await supabase
        .from('password_reset_tokens')
        .select('*')
        .eq('token', token)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (!tokenData) {
        return new Response(
          JSON.stringify({ error: 'Invalid or expired token' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update password
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        tokenData.user_id,
        { password: new_password }
      );

      if (updateError) {
        return new Response(
          JSON.stringify({ error: updateError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Mark token as used
      await supabase
        .from('password_reset_tokens')
        .update({ used: true })
        .eq('id', tokenData.id);

      return new Response(
        JSON.stringify({ success: true, message: 'Password updated successfully!' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Password reset error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to process request' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
