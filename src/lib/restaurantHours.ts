import "server-only";

import prisma from "@/lib/prisma";

const RESTAURANT_TIME_ZONE = "Asia/Beirut";

function localParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: RESTAURANT_TIME_ZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || "";
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
    get("weekday"),
  );

  return { weekday, time: `${get("hour")}:${get("minute")}` };
}

function readableTime(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return new Date(2000, 0, 1, hour, minute).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export async function getRestaurantStatus() {
  const { weekday, time } = localParts();
  const hours = await prisma.restaurantHours.findMany({
    orderBy: { dayOfWeek: "asc" },
  });
  const today = hours.find((row) => row.dayOfWeek === weekday);
  const isOpen = Boolean(
    today &&
    !today.isClosed &&
    time >= today.openTime &&
    time < today.closeTime,
  );

  if (isOpen && today) {
    return {
      isOpen: true,
      message: `Open now · Closes at ${readableTime(today.closeTime)}`,
    };
  }

  for (let offset = 1; offset <= 7; offset += 1) {
    const nextDay = (weekday + offset) % 7;
    const next = hours.find(
      (row) => row.dayOfWeek === nextDay && !row.isClosed,
    );
    if (next) {
      const dayLabel =
        offset === 1
          ? "tomorrow"
          : [
              "Sunday",
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
            ][nextDay];
      return {
        isOpen: false,
        message: `Currently closed · Orders reopen ${dayLabel} at ${readableTime(next.openTime)}`,
      };
    }
  }

  return { isOpen: false, message: "Currently closed" };
}
