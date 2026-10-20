// 无时区的表单时间视为北京时间；带 Z 或偏移量的时间保留原时刻。
export function activityDate(value) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(value)) {
    return new Date(value.replace(" ", "T") + "+08:00");
  }
  return new Date(value);
}

export function activityIso(value) {
  const date = activityDate(value);
  if (!value || !Number.isFinite(date.getTime())) throw new Error("请输入有效的活动时间");
  return date.toISOString();
}

// 日历回填北京时间，避免直接截取 UTC 导致八小时时差。
export function beijingInput(value) {
  if (!value) return "";
  const date = activityDate(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Date(date.getTime() + 8 * 3600000).toISOString().slice(0, 16);
}
