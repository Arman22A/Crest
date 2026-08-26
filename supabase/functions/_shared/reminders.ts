export type ReminderSlot = "morning" | "evening";

export function localClock(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { date: `${values.year}-${values.month}-${values.day}`, time: `${values.hour}:${values.minute}` };
}

export function dueNow(current: string, target: string) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(current)) return false;
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(target)) return false;
  const currentMinutes = toMinutes(current);
  const targetMinutes = toMinutes(target);
  return currentMinutes >= targetMinutes && currentMinutes < targetMinutes + 2;
}

export function reminderPayload(
  slot: ReminderSlot,
  date: string,
  incomplete: unknown[],
  privacyMode: unknown,
  baseUrl: string
) {
  const count = incomplete.length;
  let body = slot === "morning"
    ? `На сегодня осталось задач: ${count}.`
    : `У тебя осталось задач: ${count}.`;

  if (privacyMode === "detailed") {
    const names = incomplete
      .slice(0, 3)
      .map((task) => plainObject(task)?.title)
      .filter((title): title is string => typeof title === "string" && title.length > 0)
      .map((title) => title.slice(0, 160));
    const extra = count > names.length ? ` и ещё ${count - names.length}` : "";
    if (names.length) body = `${names.join(", ")}${extra}.`;
  }

  const target = new URL(baseUrl);
  target.searchParams.set("date", date);
  return {
    title: slot === "morning" ? "План на сегодня" : "Задачи ещё ждут",
    body,
    tag: `crest-${slot}-${date}`,
    incompleteCount: count,
    url: target.toString()
  };
}

function toMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function plainObject(value: unknown): Record<string, any> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : null;
}
