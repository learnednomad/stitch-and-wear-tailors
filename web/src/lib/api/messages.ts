import type { ListResult } from "pocketbase";
import { authedUserId, COLLECTIONS, getPb } from "@/lib/pb";
import type { Message } from "@/lib/types";

/** Conversation for an order, oldest first. */
export async function listByOrder(
  orderId: string,
  page = 1,
  perPage = 50
): Promise<ListResult<Message>> {
  const pb = getPb();
  return pb.collection(COLLECTIONS.messages).getList<Message>(page, perPage, {
    filter: pb.filter("order = {:orderId}", { orderId }),
    sort: "created",
    expand: "sender",
  });
}

export interface SendMessageInput {
  order: string;
  recipient: string;
  content: string;
  messageType?: string;
  attachment?: File;
}

export async function sendMessage(input: SendMessageInput): Promise<Message> {
  return getPb().collection(COLLECTIONS.messages).create<Message>({
    messageType: "text",
    ...input,
    sender: authedUserId(),
  });
}

export async function markRead(id: string): Promise<Message> {
  return getPb().collection(COLLECTIONS.messages).update<Message>(id, {
    isRead: true,
    readAt: new Date().toISOString(),
  });
}

/** Unread messages addressed to the signed-in user. */
export async function unreadCount(): Promise<number> {
  const pb = getPb();
  const result = await pb
    .collection(COLLECTIONS.messages)
    .getList<Message>(1, 1, {
      filter: pb.filter("recipient = {:uid} && isRead = false", {
        uid: authedUserId(),
      }),
    });
  return result.totalItems;
}
