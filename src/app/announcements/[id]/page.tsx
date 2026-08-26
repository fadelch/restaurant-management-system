import { notFound, redirect } from "next/navigation";
import AnnouncementDetails from "@/components/announcements/AnnouncementDetails";
import { getCurrentUser } from "@/lib/auth";
import { getPublishedAnnouncementById } from "@/server/announcements";

export default async function AnnouncementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/announcements/${id}`)}`);
  }
  const announcement = await getPublishedAnnouncementById(id);
  if (!announcement) notFound();
  return <AnnouncementDetails item={announcement} />;
}
