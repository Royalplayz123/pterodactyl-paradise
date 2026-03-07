import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get AFK reward settings
    const { data: settings } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "afk_rewards")
      .single();

    const afkConfig = settings?.value as any ?? {
      enabled: true,
      coins_per_interval: 1,
      interval_seconds: 60,
    };

    if (!afkConfig.enabled) {
      return new Response(
        JSON.stringify({ error: "AFK rewards are disabled", rewarded: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const coinsReward = afkConfig.coins_per_interval ?? 1;

    // Check last AFK claim
    const { data: lastClaim } = await supabase
      .from("transactions")
      .select("created_at")
      .eq("user_id", user.id)
      .eq("type", "afk_reward")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const now = new Date();
    const intervalMs = (afkConfig.interval_seconds ?? 60) * 1000;

    if (lastClaim) {
      const lastTime = new Date(lastClaim.created_at).getTime();
      const elapsed = now.getTime() - lastTime;
      if (elapsed < intervalMs) {
        const remaining = Math.ceil((intervalMs - elapsed) / 1000);
        return new Response(
          JSON.stringify({
            rewarded: false,
            remaining_seconds: remaining,
            message: `Wait ${remaining}s before next claim`,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Award coins
    const { data: profile } = await supabase
      .from("profiles")
      .select("coins")
      .eq("id", user.id)
      .single();

    const newCoins = (profile?.coins ?? 0) + coinsReward;

    await supabase
      .from("profiles")
      .update({ coins: newCoins })
      .eq("id", user.id);

    await supabase.from("transactions").insert({
      user_id: user.id,
      type: "afk_reward",
      description: `AFK reward: +${coinsReward} coins`,
      coins_change: coinsReward,
    });

    return new Response(
      JSON.stringify({
        rewarded: true,
        coins_earned: coinsReward,
        total_coins: newCoins,
        next_claim_seconds: afkConfig.interval_seconds,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
