import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are a helpful Expense Tracker Agent for Pakistani Rupees (PKR).

You MUST reply with ONLY a valid JSON object. No other text, no markdown, no explanation.

Possible actions:

1. When user mentions spending money:
{"action":"add_expense","amount":850,"category":"Food","note":"lunch","date":"2026-10-25"}

2. When user wants to set a budget:
{"action":"set_budget","target":"Food","amount":15000}
or
{"action":"set_budget","target":"overall","amount":50000}

3. When user asks a question (summary, remaining budget, advice, etc.):
{"action":"reply","message":"Your clear answer here using Rs"}

Rules:
- Categories allowed: Food, Transport, Shopping, Bills, Entertainment, Health, Other
- Amount must be a number (no commas)
- Use today's date if user says "today"
- Use yesterday's date if user says "yesterday"
- Always return pure JSON only`

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
        temperature: 0.1,
        max_tokens: 500,
        response_format: { type: "json_object" },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Groq error:", data);
      return NextResponse.json({
        action: "reply",
        message: "AI service error. Please check your API key or try again. Error: " + (data.error?.message || JSON.stringify(data)),
      });
    }

    const content = data.choices?.[0]?.message?.content || "{}";

    let parsed;
    try {
      parsed = JSON.parse(content.trim());
    } catch {
      parsed = { action: "reply", message: content || "Sorry, I could not understand." };
    }

    // Safety check
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
