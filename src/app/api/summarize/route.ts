import { groq } from "@ai-sdk/groq";
import { generateText } from "ai";

export async function POST(request: Request) {
  try {
    const { transcript, instruction } = await request.json();

    const prompt = `${instruction}\n---\n${transcript}`;

    const result = await generateText({
      model: groq("llama-3.3-70b-versatile"),
      prompt,
      temperature: 0.5,
    });

    return new Response(JSON.stringify({ summary: result.text }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Failed to generate summary." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
