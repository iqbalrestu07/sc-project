import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface WhatsAppMessage {
  to: string;
  message: string;
  template?: string;
  templateParams?: string[];
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const WHATSAPP_PHONE_ID = Deno.env.get("WHATSAPP_PHONE_ID");

    if (!WHATSAPP_ACCESS_TOKEN) {
      console.error("WHATSAPP_ACCESS_TOKEN not configured");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "WhatsApp not configured. Please add WHATSAPP_ACCESS_TOKEN in settings." 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { to, message, template, templateParams }: WhatsAppMessage = await req.json();

    if (!to) {
      return new Response(
        JSON.stringify({ success: false, error: "Phone number is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format phone number (remove + and spaces)
    const formattedPhone = to.replace(/[\s+\-()]/g, "");

    const phoneId = WHATSAPP_PHONE_ID;
    const url = `https://graph.facebook.com/v18.0/${phoneId}/messages`;

    let body;
    
    if (template) {
      // Send template message
      body = {
        messaging_product: "whatsapp",
        to: formattedPhone,
        type: "template",
        template: {
          name: template,
          language: { code: "id" },
          components: templateParams ? [
            {
              type: "body",
              parameters: templateParams.map((p) => ({ type: "text", text: p })),
            },
          ] : [],
        },
      };
    } else {
      // Send text message
      body = {
        messaging_product: "whatsapp",
        to: formattedPhone,
        type: "text",
        text: { body: message },
      };
    }

    console.log("Sending WhatsApp message to:", formattedPhone);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("WhatsApp API error:", data);
      return new Response(
        JSON.stringify({ success: false, error: data.error?.message || "Failed to send message" }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("WhatsApp message sent successfully:", data);

    return new Response(
      JSON.stringify({ success: true, messageId: data.messages?.[0]?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in send-whatsapp function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
