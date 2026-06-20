/** 从 LLM 文本中提取 JSON（纯函数，客户端/服务端均可使用） */
export function parseJsonFromText<T>(text: string): T | null {
  try {
    return JSON.parse(text.trim()) as T;
  } catch {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]) as T;
      } catch {
        return null;
      }
    }
    const arrayMatch = text.match(/\[[\s\S]*\]/);
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
