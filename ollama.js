import fetch from "node-fetch";

const OLLAMA_URL = "http://localhost:11434";

export async function listModels() {
  const res = await fetch(`${OLLAMA_URL}/api/tags`);
  const data = await res.json();
  return data.models.map(m => m.name);
}

export async function chat(model, messages) {
  console.log("📤 Sending to Ollama...");

  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      options: {
        temperature: 0.1
      }
    })
  });

  const data = await res.json();
  const content = data.message.content;

  console.log("📥 Raw response:", content.substring(0, 200) + (content.length > 200 ? "..." : ""));

  return content;
}

// Extract JSON array from response that might contain thinking/markdown
export function extractJSON(text) {
  // Remove <think>...</think> blocks (qwen3 thinking mode)
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

  // Try to find JSON array in the text
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    return arrayMatch[0];
  }

  // Try to extract from markdown code blocks
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  return cleaned;
}
