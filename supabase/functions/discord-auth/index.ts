import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DISCORD_CLIENT_ID = Deno.env.get('DISCORD_CLIENT_ID')!;
const DISCORD_CLIENT_SECRET = Deno.env.get('DISCORD_CLIENT_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.split('/').pop();

  try {
    // Step 1: Initiate OAuth - redirect to Discord
    if (path === 'authorize' || req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      const redirectUri = body.redirect_uri || `${SUPABASE_URL}/functions/v1/discord-auth/callback`;
      const frontendRedirect = body.frontend_redirect || 'https://pterodactyl-paradise.lovable.app/dashboard';
      
      const state = btoa(JSON.stringify({ frontend_redirect: frontendRedirect }));
      
      const discordAuthUrl = new URL('https://discord.com/api/oauth2/authorize');
      discordAuthUrl.searchParams.set('client_id', DISCORD_CLIENT_ID);
      discordAuthUrl.searchParams.set('redirect_uri', redirectUri);
      discordAuthUrl.searchParams.set('response_type', 'code');
      discordAuthUrl.searchParams.set('scope', 'identify email');
      discordAuthUrl.searchParams.set('state', state);

      return new Response(
        JSON.stringify({ url: discordAuthUrl.toString() }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Handle callback from Discord
    if (path === 'callback') {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const error = url.searchParams.get('error');

      if (error) {
        return new Response(`<script>window.location.href='https://pterodactyl-paradise.lovable.app/auth?error=${error}'</script>`, {
          headers: { 'Content-Type': 'text/html' },
        });
      }

      if (!code) {
        return new Response(`<script>window.location.href='https://pterodactyl-paradise.lovable.app/auth?error=no_code'</script>`, {
          headers: { 'Content-Type': 'text/html' },
        });
      }

      let frontendRedirect = 'https://pterodactyl-paradise.lovable.app/dashboard';
      try {
        const stateData = JSON.parse(atob(state || ''));
        frontendRedirect = stateData.frontend_redirect || frontendRedirect;
      } catch {}

      // Exchange code for tokens
      const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: DISCORD_CLIENT_ID,
          client_secret: DISCORD_CLIENT_SECRET,
          grant_type: 'authorization_code',
          code,
          redirect_uri: `${SUPABASE_URL}/functions/v1/discord-auth/callback`,
        }),
      });

      if (!tokenResponse.ok) {
        const errText = await tokenResponse.text();
        console.error('Token exchange failed:', errText);
        return new Response(`<script>window.location.href='https://pterodactyl-paradise.lovable.app/auth?error=token_exchange_failed'</script>`, {
          headers: { 'Content-Type': 'text/html' },
        });
      }

      const tokens = await tokenResponse.json();

      // Get user info from Discord
      const userResponse = await fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });

      if (!userResponse.ok) {
        return new Response(`<script>window.location.href='https://pterodactyl-paradise.lovable.app/auth?error=user_fetch_failed'</script>`, {
          headers: { 'Content-Type': 'text/html' },
        });
      }

      const discordUser = await userResponse.json();
      const email = discordUser.email;
      const username = discordUser.username;
      const discordId = discordUser.id;
      const avatarHash = discordUser.avatar;
      const avatarUrl = avatarHash 
        ? `https://cdn.discordapp.com/avatars/${discordId}/${avatarHash}.png`
        : null;

      if (!email) {
        return new Response(`<script>window.location.href='https://pterodactyl-paradise.lovable.app/auth?error=no_email'</script>`, {
          headers: { 'Content-Type': 'text/html' },
        });
      }

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // Check if user exists
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(u => u.email === email);

      let session;

      if (existingUser) {
        // Sign in existing user
        const { data, error: signInError } = await supabase.auth.admin.generateLink({
          type: 'magiclink',
          email,
          options: { redirectTo: frontendRedirect }
        });

        if (signInError) {
          console.error('Sign in error:', signInError);
          return new Response(`<script>window.location.href='https://pterodactyl-paradise.lovable.app/auth?error=signin_failed'</script>`, {
            headers: { 'Content-Type': 'text/html' },
          });
        }

        // Update avatar if changed
        if (avatarUrl) {
          await supabase
            .from('profiles')
            .update({ avatar_url: avatarUrl })
            .eq('id', existingUser.id);
        }

        // Use HTTP redirect for the magic link
        return new Response(null, {
          status: 302,
          headers: { 'Location': data.properties?.action_link || frontendRedirect }
        });

      } else {
        // Create new user
        const tempPassword = crypto.randomUUID();
        
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            username,
            avatar_url: avatarUrl,
            discord_id: discordId,
            provider: 'discord'
          }
        });

        if (createError) {
          console.error('Create user error:', createError);
          return new Response(`<script>window.location.href='https://pterodactyl-paradise.lovable.app/auth?error=create_failed'</script>`, {
            headers: { 'Content-Type': 'text/html' },
          });
        }

        // Generate magic link for the new user
        const { data: linkData } = await supabase.auth.admin.generateLink({
          type: 'magiclink',
          email,
          options: { redirectTo: frontendRedirect }
        });

        return new Response(`
          <html>
            <body>
              <script>
                window.location.href = '${linkData?.properties?.action_link}';
              </script>
            </body>
          </html>
        `, { headers: { 'Content-Type': 'text/html' } });
      }
    }

    return new Response(
      JSON.stringify({ error: 'Invalid endpoint' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Discord auth error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
