import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface EmailReminderRequest {
  to: string;
  patientName: string;
  appointmentDate: string;
  appointmentTime: string;
  serviceName: string;
  clinicName: string;
  clinicPhone?: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Email not configured. Please add RESEND_API_KEY in secrets." 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Dynamic import for Resend
    const { Resend } = await import("https://esm.sh/resend@2.0.0");
    const resend = new Resend(RESEND_API_KEY);

    const { 
      to, 
      patientName, 
      appointmentDate, 
      appointmentTime, 
      serviceName,
      clinicName,
      clinicPhone
    }: EmailReminderRequest = await req.json();

    if (!to || !patientName) {
      return new Response(
        JSON.stringify({ success: false, error: "Email and patient name are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Sending email reminder to:", to);

    const emailResponse = await resend.emails.send({
      from: `${clinicName} <noreply@resend.dev>`,
      to: [to],
      subject: `Appointment Reminder - ${serviceName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Appointment Reminder</title>
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="background: linear-gradient(135deg, #8B5CF6, #7C3AED); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Appointment Reminder</h1>
            </div>
            
            <div style="padding: 30px;">
              <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
                Hello <strong>${patientName}</strong>,
              </p>
              
              <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
                This is a friendly reminder about your upcoming appointment:
              </p>
              
              <div style="background-color: #F3F4F6; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Service</td>
                    <td style="padding: 8px 0; color: #111827; font-weight: 600; text-align: right;">${serviceName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Date</td>
                    <td style="padding: 8px 0; color: #111827; font-weight: 600; text-align: right;">${appointmentDate}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Time</td>
                    <td style="padding: 8px 0; color: #111827; font-weight: 600; text-align: right;">${appointmentTime}</td>
                  </tr>
                </table>
              </div>
              
              <p style="font-size: 14px; color: #6B7280; margin-bottom: 10px;">
                Please arrive 10-15 minutes early to complete any necessary paperwork.
              </p>
              
              ${clinicPhone ? `
              <p style="font-size: 14px; color: #6B7280;">
                If you need to reschedule, please contact us at <a href="tel:${clinicPhone}" style="color: #7C3AED;">${clinicPhone}</a>
              </p>
              ` : ''}
            </div>
            
            <div style="background-color: #F9FAFB; padding: 20px; text-align: center; border-top: 1px solid #E5E7EB;">
              <p style="font-size: 12px; color: #9CA3AF; margin: 0;">
                ${clinicName}
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, data: emailResponse }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in send-email-reminder function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
