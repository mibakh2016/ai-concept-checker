export const TOPIC_STORAGE_KEY = "cc_topic_id";

export function resolveTopicChoice(saved: string | null, availableIds: string[]): string {
  const candidate = saved === "Z1" ? "ZOO" : saved;
  return candidate && availableIds.includes(candidate) ? candidate : availableIds[0] ?? "";
}