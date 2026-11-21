/**
 * Groq AI Client Integration
 * Provides high-speed inference for cash forecast summaries and reminder drafting.
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'qwen/qwen3.8-27b';
const FALLBACK_MODELS = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b'];

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionOptions {
  systemPrompt?: string;
  userPrompt: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}

export function getGroqApiKey(): string | null {
  const key = process.env.GROQ_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!key || !key.trim()) return null;
  return key.trim();
}

/**
 * Executes a chat completion against Groq API.
 * Automatically tries primary and fallback models if needed.
 */
export async function createGroqChatCompletion(
  options: ChatCompletionOptions,
): Promise<string | null> {
  const apiKey = getGroqApiKey();
  if (!apiKey) {
    console.warn('Groq API key is not configured.');
    return null;
  }

  const {
    systemPrompt,
    userPrompt,
    model = DEFAULT_MODEL,
    maxTokens = 600,
    temperature = 0.5,
    timeoutMs = 8000,
  } = options;

  const messages: ChatMessage[] = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: userPrompt });

  const modelsToTry = [model, ...FALLBACK_MODELS.filter((m) => m !== model)];

  for (const candidateModel of modelsToTry) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: candidateModel,
          messages,
          max_tokens: maxTokens,
          temperature,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        console.warn(`Groq model ${candidateModel} failed with status ${response.status}: ${errorText}`);
        continue;
      }

      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content?.trim();
      if (text) {
        return text;
      }
    } catch (err: unknown) {
      console.warn(`Groq completion error on model ${candidateModel}:`, err);
    }
  }

  return null;
}

