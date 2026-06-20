import "server-only";

export { parseJsonFromText } from "./json-utils";

const MOONSHOT_BASE_URL =
  process.env.MOONSHOT_BASE_URL ?? "https://api.moonshot.cn/v1";
const MODEL = process.env.MOONSHOT_MODEL ?? "kimi-k2.6";

export interface ChatMessageParam {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  name?: string;
  tool_calls?: ToolCall[];
  reasoning_content?: string;
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

interface CompletionResponse {
  choices: Array<{
    finish_reason: string;
    message: {
      role: string;
      content: string | null;
      tool_calls?: ToolCall[];
      reasoning_content?: string;
    };
  }>;
}

export interface StreamedAssistantMessage {
  content: string;
  tool_calls?: ToolCall[];
  reasoning_content?: string;
  finish_reason: string | null;
}

interface StreamChunkChoice {
  index?: number;
  delta?: {
    role?: string;
    content?: string | null;
    tool_calls?: Array<{
      index: number;
      id?: string;
      type?: "function";
      function?: { name?: string; arguments?: string };
    }>;
    reasoning_content?: string;
  };
  finish_reason?: string | null;
}

function buildMoonshotBody(
  messages: ChatMessageParam[],
  options?: {
    tools?: ToolDefinition[];
    temperature?: number;
    maxTokens?: number;
    disableThinking?: boolean;
    stream?: boolean;
  }
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: MODEL,
    messages,
    temperature: options?.temperature ?? 0.6,
    max_tokens: options?.maxTokens ?? 8192,
  };

  if (options?.tools) {
    body.tools = options.tools;
    body.tool_choice = "auto";
  }

  if (options?.disableThinking) {
    body.thinking = { type: "disabled" };
  }

  if (options?.stream) {
    body.stream = true;
  }

  return body;
}

function mergeToolCallDelta(
  toolCalls: Array<ToolCall | undefined>,
  deltaToolCalls: NonNullable<StreamChunkChoice["delta"]>["tool_calls"]
) {
  if (!deltaToolCalls) return;

  for (const tc of deltaToolCalls) {
    const idx = tc.index;
    if (!toolCalls[idx]) {
      toolCalls[idx] = {
        id: tc.id ?? "",
        type: "function",
        function: { name: "", arguments: "" },
      };
    }
    const target = toolCalls[idx]!;
    if (tc.id) target.id = tc.id;
    if (tc.function?.name) target.function.name += tc.function.name;
    if (tc.function?.arguments) target.function.arguments += tc.function.arguments;
  }
}

async function* parseMoonshotSseStream(
  response: Response
): AsyncGenerator<StreamChunkChoice> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("无法读取 Moonshot 响应流");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data: ")) continue;

      const payload = trimmed.slice(6);
      if (payload === "[DONE]") return;

      try {
        const chunk = JSON.parse(payload) as {
          choices?: StreamChunkChoice[];
        };
        const choice = chunk.choices?.[0];
        if (choice) yield choice;
      } catch {
        // 跳过不完整 JSON 行
      }
    }
  }
}

export async function callMoonshot(
  messages: ChatMessageParam[],
  options?: {
    tools?: ToolDefinition[];
    temperature?: number;
    maxTokens?: number;
    disableThinking?: boolean;
  }
): Promise<CompletionResponse> {
  const apiKey = process.env.MOONSHOT_API_KEY;
  if (!apiKey) {
    throw new Error("MOONSHOT_API_KEY 未配置");
  }

  const response = await fetch(`${MOONSHOT_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(buildMoonshotBody(messages, options)),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Moonshot API 错误 (${response.status}): ${errorText}`);
  }

  return response.json();
}

export async function callMoonshotStream(
  messages: ChatMessageParam[],
  options?: {
    tools?: ToolDefinition[];
    temperature?: number;
    maxTokens?: number;
    disableThinking?: boolean;
    onContentDelta?: (delta: string) => void;
  }
): Promise<StreamedAssistantMessage> {
  const apiKey = process.env.MOONSHOT_API_KEY;
  if (!apiKey) {
    throw new Error("MOONSHOT_API_KEY 未配置");
  }

  const response = await fetch(`${MOONSHOT_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(buildMoonshotBody(messages, { ...options, stream: true })),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Moonshot API 错误 (${response.status}): ${errorText}`);
  }

  let content = "";
  let reasoning_content = "";
  let finish_reason: string | null = null;
  const toolCalls: Array<ToolCall | undefined> = [];

  for await (const choice of parseMoonshotSseStream(response)) {
    const delta = choice.delta;
    if (!delta) {
      if (choice.finish_reason) finish_reason = choice.finish_reason;
      continue;
    }

    if (delta.content) {
      content += delta.content;
      options?.onContentDelta?.(delta.content);
    }
    if (delta.reasoning_content) {
      reasoning_content += delta.reasoning_content;
    }
    mergeToolCallDelta(toolCalls, delta.tool_calls);
    if (choice.finish_reason) finish_reason = choice.finish_reason;
  }

  const mergedToolCalls = toolCalls.filter((tc): tc is ToolCall => Boolean(tc?.id));

  return {
    content,
    reasoning_content: reasoning_content || undefined,
    tool_calls: mergedToolCalls.length ? mergedToolCalls : undefined,
    finish_reason,
  };
}

export const READING_TOOLS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "jingdu",
      description:
        "精读工具：提取书籍精髓，生成800-1200字的精读内容。当用户说「精读」「速读」某本书时必须调用此工具。",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "书籍名称" },
          author: { type: "string", description: "作者" },
          intro: { type: "string", description: "书籍简介" },
        },
        required: ["title", "author"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "shendu",
      description:
        "深读工具：对书籍进行1500-2500字的精细深度解读。当用户说「深读」「深度解读」「深度理解」某本书时必须调用此工具。",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "书籍名称" },
          author: { type: "string", description: "作者" },
          intro: { type: "string", description: "书籍简介" },
        },
        required: ["title", "author"],
      },
    },
  },
];
