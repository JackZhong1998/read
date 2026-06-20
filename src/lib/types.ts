export type Gender = "male" | "female" | "other";
export type AgeGroup = "18-25" | "26-35" | "36-45" | "46-55" | "55+";

export interface UserProfile {
  gender: Gender;
  ageGroup: AgeGroup;
  createdAt: number;
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
  readAt: number;
  completed?: boolean;
  /** @deprecated 兼容旧数据 */
  jingduContent?: string;
  shenduContent?: string;
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
  | { event: "tool_loading"; tool: "jingdu" | "shendu"; book: BookInfo }
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
