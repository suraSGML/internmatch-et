'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sendMessage } from '@/lib/actions/interviews';

interface Message {
  id: string;
  body: string;
  sender_id: string;
  created_at: string;
  is_mine: boolean;
}

interface Props {
  applicationId: string;
  currentUserId: string;
  messages: Message[];
}

export function MessageThread({ applicationId, messages: initialMessages }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [body, setBody] = useState('');
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = () => {
    const trimmed = body.trim();
    if (!trimmed) return;

    startTransition(async () => {
      const result = await sendMessage({ application_id: applicationId, body: trimmed });
      if (result.error) {
        toast.error('Could not send message');
        return;
      }
      // Optimistic update
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          body: trimmed,
          sender_id: 'me',
          created_at: new Date().toISOString(),
          is_mine: true,
        },
      ]);
      setBody('');
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (messages.length === 0 && !body) {
    return (
      <div className="text-center py-6 text-gray-400 text-sm">
        <p>No messages yet.</p>
        <p className="text-xs mt-0.5">Start the conversation below.</p>
        <MessageInput
          body={body}
          setBody={setBody}
          onSend={handleSend}
          onKeyDown={handleKeyDown}
          isPending={isPending}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Message list */}
      <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.is_mine ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                msg.is_mine
                  ? 'bg-indigo-600 text-white rounded-br-sm'
                  : 'bg-gray-100 text-gray-800 rounded-bl-sm'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.body}</p>
              <p className={`text-xs mt-0.5 ${msg.is_mine ? 'text-indigo-200' : 'text-gray-400'}`}>
                {new Date(msg.created_at).toLocaleTimeString('en-ET', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <MessageInput
        body={body}
        setBody={setBody}
        onSend={handleSend}
        onKeyDown={handleKeyDown}
        isPending={isPending}
      />
    </div>
  );
}

function MessageInput({
  body,
  setBody,
  onSend,
  onKeyDown,
  isPending,
}: {
  body: string;
  setBody: (v: string) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  isPending: boolean;
}) {
  return (
    <div className="flex gap-2 mt-2">
      <textarea
        rows={2}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
        className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <Button
        type="button"
        size="icon"
        className="self-end h-9 w-9 bg-indigo-600 hover:bg-indigo-700"
        onClick={onSend}
        disabled={isPending || !body.trim()}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
