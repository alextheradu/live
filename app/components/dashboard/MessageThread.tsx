export type ThreadMessage = {
  id: string;
  fields: {
    Sender?: string;
    Message?: string;
    "Sent At"?: string;
  };
};

// Read-only log, not a live chat: a submitter's note only gets added
// alongside a resubmission (see SubmissionForm's "What changed" field), and
// an admin's note only alongside a Reject action (see AdminQueue) — there is
// no free-standing "send a message" path anymore.
export default function MessageThread({ messages }: { messages: ThreadMessage[] }) {
  return (
    <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
      {messages.length === 0 && <p className="text-sm opacity-60">No updates yet.</p>}
      {messages.map((m) => (
        <div key={m.id} className={`chat ${m.fields.Sender === "Admin" ? "chat-start" : "chat-end"}`}>
          <div className="chat-header text-xs opacity-60">{m.fields.Sender ?? "Unknown"}</div>
          <div className="chat-bubble">{m.fields.Message}</div>
        </div>
      ))}
    </div>
  );
}
