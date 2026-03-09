import { supabase } from '@/integrations/supabase/client';

export type NotificationType = 
  | 'new_user'
  | 'login'
  | 'server_create'
  | 'server_delete'
  | 'shop_purchase'
  | 'coupon_claim';

interface NotificationPayload {
  type: NotificationType;
  email: string;
  data?: Record<string, any>;
}

interface NotificationSettings {
  enabled: boolean;
  new_user: boolean;
  login: boolean;
  server_create: boolean;
  server_delete: boolean;
  shop_purchase: boolean;
  coupon_claim: boolean;
}

interface SmtpConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  from_email: string;
  from_name: string;
}

const emailTemplates: Record<NotificationType, (data: any) => { subject: string; html: string }> = {
  new_user: (data) => ({
    subject: `Welcome to ${data.siteName || 'Our Platform'}!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Welcome! 🎉</h1>
        </div>
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Hello <strong>${data.username || 'there'}</strong>,
          </p>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Your account has been successfully created. You're now ready to explore all the features we have to offer!
          </p>
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #6b7280; font-size: 14px; margin: 0;">
              <strong>Email:</strong> ${data.email}
            </p>
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            If you didn't create this account, please contact support.
          </p>
        </div>
      </div>
    `,
  }),

  login: (data) => ({
    subject: 'New Login Detected',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #1f2937; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🔐 New Login</h1>
        </div>
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Hello <strong>${data.username || 'there'}</strong>,
          </p>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            We detected a new login to your account.
          </p>
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">
              <strong>Time:</strong> ${new Date().toLocaleString()}
            </p>
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            If this wasn't you, please change your password immediately.
          </p>
        </div>
      </div>
    `,
  }),

  server_create: (data) => ({
    subject: `Server Created: ${data.serverName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🖥️ Server Created</h1>
        </div>
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Your new server has been created successfully!
          </p>
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #374151; font-size: 14px; margin: 0 0 8px 0;">
              <strong>Server Name:</strong> ${data.serverName}
            </p>
            <p style="color: #374151; font-size: 14px; margin: 0 0 8px 0;">
              <strong>Type:</strong> ${data.serverType}
            </p>
            <p style="color: #374151; font-size: 14px; margin: 0;">
              <strong>Resources:</strong> ${data.ram}MB RAM, ${data.cpu}% CPU, ${data.disk}MB Disk
            </p>
          </div>
        </div>
      </div>
    `,
  }),

  server_delete: (data) => ({
    subject: `Server Deleted: ${data.serverName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #ef4444; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🗑️ Server Deleted</h1>
        </div>
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Your server <strong>${data.serverName}</strong> has been deleted.
          </p>
          <p style="color: #6b7280; font-size: 14px;">
            Resources have been returned to your account.
          </p>
        </div>
      </div>
    `,
  }),

  shop_purchase: (data) => ({
    subject: `Purchase Confirmed: ${data.itemName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🛒 Purchase Confirmed</h1>
        </div>
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Thank you for your purchase!
          </p>
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #374151; font-size: 14px; margin: 0 0 8px 0;">
              <strong>Item:</strong> ${data.itemName}
            </p>
            <p style="color: #374151; font-size: 14px; margin: 0;">
              <strong>Cost:</strong> ${data.price} coins
            </p>
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            Resources have been added to your account.
          </p>
        </div>
      </div>
    `,
  }),

  coupon_claim: (data) => ({
    subject: `Coupon Redeemed: ${data.code}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🎁 Coupon Redeemed</h1>
        </div>
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            You've successfully redeemed a coupon!
          </p>
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #374151; font-size: 14px; margin: 0 0 8px 0;">
              <strong>Code:</strong> ${data.code}
            </p>
            ${data.coins ? `<p style="color: #374151; font-size: 14px; margin: 0;">+${data.coins} coins</p>` : ''}
            ${data.ram ? `<p style="color: #374151; font-size: 14px; margin: 0;">+${data.ram}MB RAM</p>` : ''}
            ${data.cpu ? `<p style="color: #374151; font-size: 14px; margin: 0;">+${data.cpu}% CPU</p>` : ''}
            ${data.disk ? `<p style="color: #374151; font-size: 14px; margin: 0;">+${data.disk}MB Disk</p>` : ''}
          </div>
        </div>
      </div>
    `,
  }),
};

export async function sendNotification(payload: NotificationPayload): Promise<boolean> {
  try {
    // Get notification settings
    const { data: notifData } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'notification_settings')
      .single();

    const settings = notifData?.value as NotificationSettings | null;
    
    if (!settings?.enabled || !settings[payload.type]) {
      console.log(`Notification ${payload.type} is disabled`);
      return false;
    }

    // Get SMTP config
    const { data: smtpData } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'smtp_config')
      .single();

    const smtpConfig = smtpData?.value as SmtpConfig | null;

    if (!smtpConfig?.host || !smtpConfig?.username || !smtpConfig?.password) {
      console.log('SMTP not configured');
      return false;
    }

    // Generate email content
    const template = emailTemplates[payload.type](payload.data || {});

    // Send via edge function
    const { error } = await supabase.functions.invoke('send-email', {
      body: {
        action: 'send_email',
        to: payload.email,
        subject: template.subject,
        html: template.html,
        smtp_config: smtpConfig,
      },
    });

    if (error) {
      console.error('Failed to send notification:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Notification error:', err);
    return false;
  }
}