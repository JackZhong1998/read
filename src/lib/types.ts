export type Gender = "male" | "female" | "other";
export type AgeGroup =
  | "under-12"
  | "12-18"
  | "18-22"
  | "22-30"
  | "30-40"
  | "40-50"
  | "50+";

export interface UserProfile {
  gender: Gender;
  ageGroup: AgeGroup;
  createdAt: number;
}

/** 发现页保存的性别与年龄段偏好（独立于 profile，需用户手动保存/修改） */
export interface DiscoverPreference {
  gender: Gender;
  ageGroup: AgeGroup;
  savedAt: number;
}

export interface BookInfo {
  title: string;
  author: string;
  intro?: string;
}

export type MessageType = "chat" | "rec" | "jingdu" | "shendu";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  type: MessageType;
  content: string;
  book?: BookInfo;
  timestamp: number;
  streaming?: boolean;
}

export interface ReadBook {
  id: string;
  title: string;
  author: string;
  intro?: string;
  readType: "jingdu" | "shendu";
  content: string;
  /** 压缩精髓，供 Agent 上下文使用 */
  essence?: string;
  readAt: number;
  completed?: boolean;
  /** @deprecated 兼容旧数据 */
  jingduContent?: string;
  shenduContent?: string;
}

export interface BookInsight {
  title: string;
  author: string;
  jingduEssence?: string;
  shenduEssence?: string;
  recommendedIn?: string[];
  lastInteraction: number;
}

/** 本地长期阅读记忆（localStorage） */
export interface ReaderMemory {
  /** 规则匹配到的明确诉求 */
  statedGoals: string[];
  /** 从关键词推断的主题偏好 */
  themes: string[];
  /** 用户说过的重要原话（从滚出窗口的对话中折叠） */
  conversationNotes: string[];
  /** 滚出 history 窗口的对话批次摘要（逐段追加） */
  conversationSummary: string;
  /** 已从消息列表头部折叠进记忆的消息条数 */
  summarizedMessageCount: number;
  bookInsights: Record<string, BookInsight>;
  updatedAt: number;
}

export interface BookCache {
  [key: string]: {
    rec?: string;
    jingdu?: string;
    shendu?: string;
    book: BookInfo;
    updatedAt: number;
  };
}

export interface ConversationState {
  messages: ChatMessage[];
  suggestions: string[];
}

export interface RecommendResponse {
  chat: string;
  rec: string;
  book?: BookInfo;
}

export type RecommendStreamEvent =
  | { event: "tool_loading"; tool: "tuijian" | "jingdu" | "shendu"; book?: BookInfo }
  | {
      event: "message_start";
      id: string;
      type: "chat" | "rec" | "jingdu" | "shendu";
      book?: BookInfo;
    }
  | { event: "message_delta"; id: string; delta: string }
  | {
      event: "message_done";
      id: string;
      type: "chat" | "rec" | "jingdu" | "shendu";
      content: string;
      book?: BookInfo;
    }
  | { event: "done" }
  | { event: "error"; message: string };

export interface ReadMode {
  mode: "page" | "scroll";
}
