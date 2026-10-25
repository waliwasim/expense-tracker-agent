import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are an Expense Tracker Agent for Pakistani Rupees (PKR / Rs).

Current date context: use today's date when user says "today" or "yesterday".

You can perform these actions by returning STRICT JSON only (no markdown, no extra text):

1. Add expense:
{"action":"add_expense","amount":1200,"category":"Food","note":"lunch","date":"2026-10-25"}

2. Set budget (overall or category):
{"action":"set_budget","target":"Food","amount":18000}
{"action":"set_budget","target":"overall","amount":60000}

3. Answer questions (use this when user asks for summary, remaining budget, insights, etc.):
{"action":"reply","message":"Your friendly helpful reply here in plain English. Use Rs and PKR."}

Rules:
- Categories must be exactly one of: Food, Transport, Shopping, Bills, Entertainment, Health, Other
- Always use numbers only for amounts (no commas)
- If user is vague, make a reasonable assumption and mention it
- Be concise and helpful
- When showing remaining budget, calculate based on the expenses and budgets provided in the user message
`;

export async function POST(req: NextRequest) {
  try {
    const { messages, expenses, budgets } = await req.json();

    const context = `
Current expenses (this month):
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
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: SYSTEM_PROMPT + "\n\n" + context },
          ...messages,
        ],
        temperature: 0.3,
        max_tokens: 800,
      }),
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Try to parse pure JSON
    let parsed;
    try {
      parsed = JSON.parse(content.trim());
    } catch {
      parsed = { action: "reply", message: content };
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { action: "reply", message: "Sorry, something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
