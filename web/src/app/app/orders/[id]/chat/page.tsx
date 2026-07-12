"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { listByOrder, markRead, sendMessage } from "@/lib/api/messages";
import { subscribe } from "@/lib/api/realtime";
import { useAuth } from "@/lib/auth";
import { formatDateTime, relativeTime } from "@/lib/format";
import { COLLECTIONS, getPb, pbErrorMessage } from "@/lib/pb";
import type { Message, Order } from "@/lib/types";
import { displayName } from "@/components/client/order-utils";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";

export default function OrderChatPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const toast = useToast();

  const [order, setOrder] = useState<Order | null>(null);
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Initial load: the order (for the tailor party) + the conversation.
  useEffect(() => {
    if (!id) return;
    let active = true;
    Promise.all([
      getPb()
        .collection(COLLECTIONS.orders)
        .getOne<Order>(id, { expand: "tailor,customer" }),
      listByOrder(id, 1, 200),
    ])
      .then(([o, msgs]) => {
        if (!active) return;
        setOrder(o);
        setMessages(msgs.items);
      })
      .catch((err) => {
        if (active) setLoadError(pbErrorMessage(err));
      });
    return () => {
      active = false;
    };
  }, [id]);

  // Realtime: append new messages for this order as they arrive.
  useEffect(() => {
    if (!id) return;
    const off = subscribe<Message>(
      COLLECTIONS.messages,
      (e) => {
        if (e.action === "create") {
          setMessages((prev) =>
            prev && !prev.some((m) => m.id === e.record.id)
              ? [...prev, e.record]
              : prev
          );
        }
      },
      { filter: `order = "${id}"`, expand: "sender" }
    );
    return off;
  }, [id]);

  // Mark incoming messages as read while the thread is on screen.
  useEffect(() => {
    if (!messages || !user) return;
    const unread = messages.filter((m) => m.recipient === user.id && !m.isRead);
    if (unread.length === 0) return;
    Promise.all(unread.map((m) => markRead(m.id).catch(() => null))).then(() =>
      setMessages((prev) =>
        prev
          ? prev.map((m) =>
              m.recipient === user.id && !m.isRead
                ? { ...m, isRead: true }
                : m
            )
          : prev
      )
    );
  }, [messages, user]);

  // Keep the latest message in view.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages?.length]);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    const content = draft.trim();
    if (!content || !order?.tailor || !user) return;
    setSending(true);
    try {
      const msg = await sendMessage({
        order: order.id,
        recipient: order.tailor,
        content,
      });
      setDraft("");
      setMessages((prev) =>
        prev && !prev.some((m) => m.id === msg.id) ? [...prev, msg] : prev
      );
    } catch (err) {
      toast.show(pbErrorMessage(err), "error");
    } finally {
      setSending(false);
    }
  }

  if (loadError) {
    return (
      <div>
        <PageHeader title="Conversation" />
        <EmptyState title="Couldn't load this conversation" description={loadError} />
      </div>
    );
  }

  if (!order || !messages) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  const tailor = order.expand?.tailor;

  return (
    <div>
      <div className="mb-2">
        <Link
          href={`/app/orders/${order.id}`}
          className="text-sm font-medium text-neutral-500 hover:text-neutral-800"
        >
          ← {order.orderNumber || "Order"}
        </Link>
      </div>
      <PageHeader
        title={tailor ? displayName(tailor) : "Conversation"}
        description={`About order ${order.orderNumber || order.id}`}
      />

      {!order.tailor ? (
        <EmptyState
          title="No tailor yet"
          description="Messaging opens once a tailor accepts your order. Check back soon."
        />
      ) : (
        <Card flush className="flex h-[60vh] min-h-96 flex-col">
          <div className="flex-1 space-y-3 overflow-y-auto p-5">
            {messages.length === 0 ? (
              <p className="py-10 text-center text-sm text-neutral-400">
                No messages yet — say hello to {displayName(tailor)}.
              </p>
            ) : (
              messages.map((m) => {
                const own = m.sender === user?.id;
                return (
                  <div
                    key={m.id}
                    className={`flex ${own ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm ${
                        own
                          ? "rounded-br-sm bg-brand-700 text-white"
                          : "rounded-bl-sm bg-neutral-100 text-neutral-800"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">
                        {m.content}
                      </p>
                      <p
                        className={`mt-1 text-[11px] ${
                          own ? "text-brand-100/80" : "text-neutral-400"
                        }`}
                        title={formatDateTime(m.created)}
                      >
                        {relativeTime(m.created)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>
          <form
            onSubmit={handleSend}
            className="flex items-center gap-2 border-t border-neutral-200 p-3"
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={`Message ${displayName(tailor)}…`}
              aria-label="Message"
              className="min-w-0 flex-1 rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-2 focus:outline-offset-1 focus:outline-brand-700"
            />
            <Button type="submit" loading={sending} disabled={!draft.trim()}>
              Send
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
