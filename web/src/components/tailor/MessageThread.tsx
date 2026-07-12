"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { listByOrder, markRead, sendMessage } from "@/lib/api/messages";
import { subscribe } from "@/lib/api/realtime";
import { relativeTime } from "@/lib/format";
import { authedUserId, COLLECTIONS, pbErrorMessage } from "@/lib/pb";
import type { Message } from "@/lib/types";

export interface MessageThreadProps {
  orderId: string;
  /** The customer on the order (message recipient). */
  recipientId: string;
  /** Display name for the other party. */
  recipientName: string;
}

/** Embedded order conversation: list (oldest first), send, mark read, realtime. */
export function MessageThread({
  orderId,
  recipientId,
  recipientName,
}: MessageThreadProps) {
  const toast = useToast();
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const uid = authedUserId();

  const load = useCallback(async () => {
    try {
      const result = await listByOrder(orderId, 1, 200);
      setMessages(result.items);
      // Mark incoming unread messages as read (best-effort).
      const unread = result.items.filter(
        (m) => m.recipient === uid && !m.isRead
      );
      await Promise.all(unread.map((m) => markRead(m.id).catch(() => {})));
    } catch {
      setMessages([]);
    }
  }, [orderId, uid]);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  useEffect(() => {
    const off = subscribe<Message>(COLLECTIONS.messages, (e) => {
      if (e.record.order === orderId) void load();
    });
    return () => off();
  }, [orderId, load]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  async function handleSend() {
    const content = draft.trim();
    if (!content) return;
    setSending(true);
    try {
      await sendMessage({ order: orderId, recipient: recipientId, content });
      setDraft("");
      await load();
    } catch (err) {
      toast.show(pbErrorMessage(err), "error");
    } finally {
      setSending(false);
    }
  }

  if (messages === null) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={scrollRef}
        className="flex max-h-80 flex-col gap-2 overflow-y-auto pr-1"
      >
        {messages.length === 0 && (
          <p className="py-6 text-center text-sm text-neutral-400">
            No messages yet — say hello to {recipientName}.
          </p>
        )}
        {messages.map((m) => {
          const own = m.sender === uid;
          return (
            <div
              key={m.id}
              className={`flex flex-col ${own ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
                  own
                    ? "rounded-br-sm bg-brand-700 text-white"
                    : "rounded-bl-sm bg-neutral-100 text-neutral-800"
                }`}
              >
                {m.content}
              </div>
              <span className="mt-0.5 text-[11px] text-neutral-400">
                {own ? "You" : recipientName} · {relativeTime(m.created)}
              </span>
            </div>
          );
        })}
      </div>
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSend();
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Message ${recipientName}…`}
          className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-2 focus:outline-offset-1 focus:outline-brand-700"
        />
        <Button type="submit" loading={sending} disabled={!draft.trim()}>
          Send
        </Button>
      </form>
    </div>
  );
}
