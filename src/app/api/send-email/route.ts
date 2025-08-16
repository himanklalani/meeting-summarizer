import { Resend } from "resend";

export async function POST(request: Request) {
  try {
    const { emails, subject, summary } = await request.json();

    if (!emails || !subject || !summary) {
      return new Response(
        JSON.stringify({ error: "Missing required fields." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    
    const allowedRecipients = ["lolopvt14@gmail.com"];

   
    const toList = emails
      .split(",")
      .map((email: string) => email.trim())
      .filter((email: string) => allowedRecipients.includes(email));

    if (toList.length === 0) {
      return new Response(
        JSON.stringify({
          error:
            "Testing is only allowed to your own email address (lolopvt14@gmail.com). To send emails to other recipients, please verify a domain at resend.com/domains.",
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const result = await resend.emails.send({
      from: "onboarding@resend.dev", // default sender
      to: toList,
      subject: subject.trim(),
      html: `<pre style="font-family: monospace; white-space: pre-wrap;">${summary.trim()}</pre>`,
      text: summary.trim(),
    });

    if (result.error) {
      console.error("Resend error:", result.error);
      return new Response(
        JSON.stringify({ error: result.error.message || "Error sending email." }),
        { status: 422, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ ok: true, id: result.data?.id }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Internal error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to send email due to server error." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
