/** 剥离 LLM 可能附加的 Markdown 代码块包裹（含仅结尾 ``` 的情况） */
export function stripJsonCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/i);
  if (fenced) return fenced[1]!.trim();

  let s = trimmed;
  s = s.replace(/^```(?:json)?\s*\n?/i, "");
  s = s.replace(/\n?```\s*$/g, "");
  s = s.replace(/^json\s*\n/i, "");
  return s.trim();
}

/** 从 LLM 文本中提取 JSON（纯函数，客户端/服务端均可使用） */
export function parseJsonFromText<T>(text: string): T | null {
  const cleaned = stripJsonCodeFences(text);
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]) as T;
      } catch {
        return null;
      }
    }
    const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[0]) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}
