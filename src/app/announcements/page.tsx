import { redirect } from "next/navigation";
import AnnouncementList from "@/components/announcements/AnnouncementList";
import { getCurrentUser } from "@/lib/auth";
import { getPublishedAnnouncements } from "@/server/announcements";

export default async function AnnouncementsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/announcements");
  const announcements = await getPublishedAnnouncements();
  return <AnnouncementList items={announcements} />;
}
