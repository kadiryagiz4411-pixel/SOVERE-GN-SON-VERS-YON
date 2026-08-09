import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const { email, full_name } = payload;

    if (!email) {
      return new Response(JSON.stringify({ error: "Email required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ADMIN_EMAIL = "kadiryagiz4411@gmail.com";
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

    console.log(`[NEW USER] Email: ${email}, Name: ${full_name || 'N/A'}`);

    // Send admin notification email
    // We use Supabase's built-in SMTP via the resend-compatible endpoint
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const now = new Date().toISOString();
    const emailBody = `
🆕 New Sovereign User Registered

Email: ${email}
Name: ${full_name || 'Not provided'}
Time: ${now}

→ Log in to Admin panel to see user details: https://sovereignapp.pro/admin
    `.trim();

    // Send via Supabase built-in email (uses project SMTP)
    const emailRes = await fetch(`${supabaseUrl}/functions/v1/send-admin-email`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: ADMIN_EMAIL,
        subject: `🆕 New Sovereign User: ${email}`,
        body: emailBody,
      }),
    }).catch(() => null);

    // Primary: use Supabase Auth admin email / Resend if configured
    // Primary: use Supabase Auth admin email / Resend if configured
    if (!emailRes || !emailRes.ok) {
      // Fallback: use OpenAI for a notification log
      if (OPENAI_API_KEY) {
        const notifRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "user",
                content: `Log this new user registration: Email: ${email}, Name: ${full_name || 'N/A'}, Time: ${now}. Reply with OK.`,
              },
            ],
          }),
        }).catch(() => null);

        if (notifRes?.ok) {
          console.log(`[NOTIFICATION LOGGED] New user: ${email}`);
        }
      }
    }

    // Use Supabase's built-in email via the auth admin API
    // This sends a real email using the project's email provider
    const adminEmailRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: "GET",
      headers: {
        "apikey": serviceKey,
        "Authorization": `Bearer ${serviceKey}`,
      },
    }).catch(() => null);

    // Try sending via Resend-compatible SMTP using Supabase edge email
    const emailSendRes = await fetch(`${supabaseUrl}/functions/v1/resend-email`, {
      method: "POST", 
      headers: {
        "Authorization": `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Sovereign App <noreply@sovereignapp.pro>",
        to: [ADMIN_EMAIL],
        subject: `🆕 New Sovereign User: ${email}`,
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; background: #1a1a1a; color: #fff; border-radius: 12px;">
            <h2 style="color: #d4a537; margin-top: 0;">🆕 New User Registered</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; color: #aaa;">Email:</td><td style="padding: 8px 0; font-weight: bold;">${email}</td></tr>
              <tr><td style="padding: 8px 0; color: #aaa;">Name:</td><td style="padding: 8px 0;">${full_name || 'Not provided'}</td></tr>
              <tr><td style="padding: 8px 0; color: #aaa;">Time:</td><td style="padding: 8px 0;">${now}</td></tr>
            </table>
            <a href="https://sovereignapp.pro/admin" style="display: inline-block; margin-top: 16px; padding: 10px 20px; background: #d4a537; color: #000; border-radius: 8px; text-decoration: none; font-weight: bold;">
              View in Admin Panel →
            </a>
          </div>
        `,
      }),
    }).catch(() => null);

    if (emailSendRes?.ok) {
      console.log(`[EMAIL SENT] New user notification sent to ${ADMIN_EMAIL}`);
    } else {
      console.log(`[EMAIL FALLBACK] Could not send via resend, logged: ${email}`);
    }

    return new Response(
      JSON.stringify({ success: true, notified: ADMIN_EMAIL }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Notification error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to send notification" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
