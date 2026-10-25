import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are a helpful Expense Tracker Agent for Pakistani Rupees (PKR).

IMPORTANT: Always reply with ONLY a valid JSON object. Nothing else.

When the user mentions one or more expenses, return this format:
{"action":"add_expenses","expenses":[{"amount":500,"category":"Transport","note":"car fare"},{"amount":1500,"category":"Food","note":"food"},{"amount":729,"category":"Entertainment","note":"movie"}]}

When setting a budget:
{"action":"set_budget","target":"Food","amount":15000}
or
{"action":"set_budget","target":"overall","amount":50000}

When answering questions:
{"action":"reply","message":"Your clear helpful answer here using Rs"}

Rules:
- Categories must be exactly one of: Food, Transport, Shopping, Bills, Entertainment, Health, Other
- amount must be a pure number (no commas or Rs)
- Use today's date automatically
- If user mentions multiple spendings in one message, put all of them in the expenses array
- Never add any text outside the JSON`

export async function POST(req: NextRequest) {
  try {
    const { messages, expenses, budgets } = await req.json();

    const context = `
Current expenses this month:
${JSON.stringify(expenses, null, 2)}

Current budgets (PKR):
${JSON.stringify(budgets, null, 2)}
`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        messages: [
          { role: "system", content: SYSTEM_PROMPT + "\n\n" + context },
          ...messages,
        ],
        temperature: 0.2,
        max_tokens: 600,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Groq error:", data);
      return NextResponse.json({
        action: "reply",
        message: "AI service error. Please try again in a moment.",
      });
    }

    let content = data.choices?.[0]?.message?.content || "{}";

    // Clean possible markdown or extra text
    content = content.trim();
    if (content.startsWith("```")) {
      content = content.replace(/```json?/g, "").replace(/```/g, "").trim();
    }

    // Try to extract JSON object if model added extra text
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      content = jsonMatch[0];
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { action: "reply", message: content || "Sorry, I could not understand that." };
    }

    if (!parsed.action) {
      parsed = { action: "reply", message: content };
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { action: "reply", message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
