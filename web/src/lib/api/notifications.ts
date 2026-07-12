import type { ListResult } from "pocketbase";
import { authedUserId, COLLECTIONS, getPb } from "@/lib/pb";
import type { AppNotification } from "@/lib/types";

export async function listMine(
  page = 1,
  perPage = 30
): Promise<ListResult<AppNotification>> {
  const pb = getPb();
  return pb
    .collection(COLLECTIONS.notifications)
    .getList<AppNotification>(page, perPage, {
      filter: pb.filter("user = {:uid}", { uid: authedUserId() }),
      sort: "-created",
    });
}

export async function unreadCount(): Promise<number> {
  const pb = getPb();
  const result = await pb
    .collection(COLLECTIONS.notifications)
    .getList<AppNotification>(1, 1, {
      filter: pb.filter("user = {:uid} && isRead = false", {
        uid: authedUserId(),
      }),
    });
  return result.totalItems;
}

export async function markRead(id: string): Promise<AppNotification> {
  return getPb()
    .collection(COLLECTIONS.notifications)
    .update<AppNotification>(id, {
      isRead: true,
      readAt: new Date().toISOString(),
    });
}

export async function markAllRead(): Promise<void> {
  const pb = getPb();
  const unread = await pb
    .collection(COLLECTIONS.notifications)
    .getFullList<AppNotification>({
      filter: pb.filter("user = {:uid} && isRead = false", {
        uid: authedUserId(),
      }),
      fields: "id",
    });
  await Promise.all(unread.map((n) => markRead(n.id)));
}
