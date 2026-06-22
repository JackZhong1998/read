import type { AgeGroup, Gender } from "./types";
import { getDiscoverItems, getAgeLabel as getDiscoverAgeLabel, getAgeShortLabel } from "./discover-data";

export interface TopicQuestion {
  id: string;
  label: string;
  prompt: string;
}

export function getTopicQuestions(gender: Gender, ageGroup: AgeGroup): TopicQuestion[] {
  return getDiscoverItems(gender, ageGroup).map((item) => ({
    id: item.id,
    label: item.bookTitle.replace(/[《》]/g, ""),
    prompt: item.prompt,
  }));
}

export function getGenderLabel(gender: Gender): string {
  const map: Record<Gender, string> = { male: "男", female: "女", other: "其他" };
  return map[gender];
}

export function getAgeLabel(ageGroup: AgeGroup): string {
  return getDiscoverAgeLabel(ageGroup);
}

export { getAgeShortLabel };
