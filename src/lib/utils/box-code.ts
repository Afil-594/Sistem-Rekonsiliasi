function formatDatePart(value: number) {
  return value.toString().padStart(2, "0");
}

export function generateBoxCode(now = new Date()) {
  const year = now.getFullYear();
  const month = formatDatePart(now.getMonth() + 1);
  const day = formatDatePart(now.getDate());
  const hours = formatDatePart(now.getHours());
  const minutes = formatDatePart(now.getMinutes());
  const seconds = formatDatePart(now.getSeconds());
  const randomSuffix = Math.random().toString(36).slice(2, 8).toUpperCase();

  return `BOX-${year}${month}${day}-${hours}${minutes}${seconds}-${randomSuffix}`;
}
