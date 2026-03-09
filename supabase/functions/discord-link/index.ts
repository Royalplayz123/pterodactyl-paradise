import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DISCORD_CLIENT_ID = Deno.env.get('DISCORD_CLIENT_ID')!;
const DISCORD_CLIENT_SECRET = Deno.env.get('DISCORD_CLIENT_SECRET')!;
const DISCORD_BOT_TOKEN = Deno.env.get('DISCORD_BOT_TOKEN')!;
const DISCORD_SERVER_ID = Deno.env.get('DISCORD_SERVER_ID')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.split('/').pop();

  try {
    // Step 1: Initiate OAuth for linking Discord (requires auth)
    if (path === 'authorize' || req.method === 'POST') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const token = authHeader.replace('Bearer ', '');
      const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
      
      if (claimsError || !claimsData?.user) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const userId = claimsData.user.id;
      const body = await req.json().catch(() => ({}));
      const frontendRedirect = body.frontend_redirect || 'https://pterodactyl-paradise.lovable.app/dashboard/account';
      
      // State includes user_id to link after OAuth
      const state = btoa(JSON.stringify({ 
        user_id: userId,
        frontend_redirect: frontendRedirect,
        action: 'link'
      }));
      
      const redirectUri = `${SUPABASE_URL}/functions/v1/discord-link/callback`;
      
      // Request guilds.join scope for auto-join server
      const discordAuthUrl = new URL('https://discord.com/api/oauth2/authorize');
      discordAuthUrl.searchParams.set('client_id', DISCORD_CLIENT_ID);
      discordAuthUrl.searchParams.set('redirect_uri', redirectUri);
      discordAuthUrl.searchParams.set('response_type', 'code');
      discordAuthUrl.searchParams.set('scope', 'identify guilds.join');
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

      let frontendRedirect = 'https://pterodactyl-paradise.lovable.app/dashboard/account';
      let userId: string | null = null;

      try {
        const stateData = JSON.parse(atob(state || ''));
        frontendRedirect = stateData.frontend_redirect || frontendRedirect;
        userId = stateData.user_id;
      } catch {}

      if (error || !code) {
        return new Response(null, {
          status: 302,
          headers: { 'Location': `${frontendRedirect}?discord_error=${error || 'no_code'}` }
        });
      }

      if (!userId) {
        return new Response(null, {
          status: 302,
          headers: { 'Location': `${frontendRedirect}?discord_error=no_user` }
        });
      }

      // Exchange code for tokens
      const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: DISCORD_CLIENT_ID,
          client_secret: DISCORD_CLIENT_SECRET,
          grant_type: 'authorization_code',
          code,
          redirect_uri: `${SUPABASE_URL}/functions/v1/discord-link/callback`,
        }),
      });

      if (!tokenResponse.ok) {
        console.error('Token exchange failed:', await tokenResponse.text());
        return new Response(null, {
          status: 302,
          headers: { 'Location': `${frontendRedirect}?discord_error=token_failed` }
        });
      }

      const tokens = await tokenResponse.json();

      // Get user info from Discord
      const userResponse = await fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });

      if (!userResponse.ok) {
        return new Response(null, {
          status: 302,
          headers: { 'Location': `${frontendRedirect}?discord_error=user_fetch_failed` }
        });
      }

      const discordUser = await userResponse.json();
      const discordId = discordUser.id;
      const discordUsername = discordUser.username;
      const avatarHash = discordUser.avatar;
      const avatarUrl = avatarHash 
        ? `https://cdn.discordapp.com/avatars/${discordId}/${avatarHash}.png`
        : null;

      // Add user to Discord server using bot
      try {
        const joinResponse = await fetch(
          `https://discord.com/api/v10/guilds/${DISCORD_SERVER_ID}/members/${discordId}`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              access_token: tokens.access_token,
            }),
          }
        );

        if (!joinResponse.ok && joinResponse.status !== 204) {
          const joinError = await joinResponse.text();
          console.warn('Failed to add user to server:', joinError);
          // Continue anyway - linking is more important
        } else {
          console.log(`Successfully added/confirmed user ${discordId} in server ${DISCORD_SERVER_ID}`);
        }
      } catch (joinErr) {
        console.warn('Error adding user to server:', joinErr);
      }

      // Update user profile with Discord info
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          discord_id: discordId,
          discord_username: discordUsername,
          avatar_url: avatarUrl || undefined
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Profile update error:', updateError);
        return new Response(null, {
          status: 302,
          headers: { 'Location': `${frontendRedirect}?discord_error=profile_update_failed` }
        });
      }

      return new Response(null, {
        status: 302,
        headers: { 'Location': `${frontendRedirect}?discord_linked=true` }
      });
    }

    return new Response(
      JSON.stringify({ error: 'Invalid endpoint' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Discord link error:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
