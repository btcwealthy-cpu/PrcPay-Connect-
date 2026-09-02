import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { io } from "socket.io-client";
import { Send, LogOut, User as UserIcon, Hash, ArrowLeft } from "lucide-react";

export default function Chat() {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const socketRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [loading, user, navigate]);

  // Load conversations
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem("token");
    fetch("/api/conversations", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        setConversations(d.conversations || []);
        if (d.conversations?.length && !activeConv) setActiveConv(d.conversations[0].id);
      });
  }, [user]);

  // Socket connection
  useEffect(() => {
    if (!user) return;
    const socket = io({ transports: ["websocket", "polling"] });
    socketRef.current = socket;
    socket.on("message", (msg) => {
      if (msg.conversation_id === activeConv || msg.conversation_id === undefined) {
        setMessages((prev) => [...prev, msg]);
      }
    });
    return () => socket.disconnect();
  }, [user]);

  // Load messages when active conversation changes
  useEffect(() => {
    if (!activeConv || !user) return;
    const token = localStorage.getItem("token");
    socketRef.current?.emit("leave", activeConv);
    fetch(`/api/messages/${activeConv}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        setMessages(d.messages || []);
        socketRef.current?.emit("join", activeConv);
      });
  }, [activeConv, user]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function sendMessage(e) {
    e.preventDefault();
    if (!input.trim() || !activeConv) return;
    const token = localStorage.getItem("token");
    const content = input.trim();
    setInput("");
    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ conversationId: activeConv, content }),
    });
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400">Loading…</div>;
  if (!user) return null;

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full flex items-center justify-center" style={{ background: user.avatar_color }}>
            <span className="text-white font-semibold text-sm">{(user.display_name || user.email)[0].toUpperCase()}</span>
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-sm">{user.display_name || user.email.split("@")[0]}</p>
            <p className="text-xs text-slate-400">{user.status_message || "Online"}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => navigate("/profile")} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
            <UserIcon className="h-5 w-5" />
          </button>
          <button onClick={logout} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Conversation list (mobile: show list or chat) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className={`w-full sm:w-72 border-r border-slate-200 bg-white flex-col ${activeConv ? "hidden sm:flex" : "flex"}`}>
          <div className="px-4 py-3 border-b border-slate-100">
            <h2 className="font-semibold text-slate-700 text-sm">Conversations</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveConv(c.id)}
                className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-50 ${activeConv === c.id ? "bg-slate-100" : ""}`}
              >
                <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                  <Hash className="h-5 w-5 text-slate-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-800 text-sm truncate">{c.name || "Direct"}</p>
                  <p className="text-xs text-slate-400 truncate">{c.last_message || "No messages yet"}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat area */}
        <div className={`flex-1 flex-col ${activeConv ? "flex" : "hidden sm:flex"}`}>
          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
            {activeConv && (
              <button onClick={() => setActiveConv(null)} className="sm:hidden mb-2 text-slate-500 flex items-center gap-1 text-sm">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
            )}
            {messages.length === 0 && (
              <div className="h-full flex items-center justify-center text-slate-300 text-sm">
                No messages yet — say hello!
              </div>
            )}
            {messages.map((m) => {
              const isMe = m.sender_id === user.id;
              return (
                <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                    {!isMe && (
                      <span className="text-xs text-slate-400 mb-0.5 px-1">{m.display_name}</span>
                    )}
                    <div
                      className={`px-3.5 py-2 rounded-2xl text-sm ${isMe ? "bg-slate-900 text-white rounded-br-md" : "bg-white text-slate-800 border border-slate-200 rounded-bl-md"}`}
                    >
                      {m.content}
                    </div>
                    <span className="text-[10px] text-slate-300 mt-0.5 px-1">
                      {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Input */}
          <form onSubmit={sendMessage} className="p-3 border-t border-slate-200 bg-white flex gap-2 shrink-0">
            <input
              type="text" value={input} onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message…" className="flex-1 h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-400 outline-none text-sm"
            />
            <button type="submit" disabled={!input.trim()} className="h-11 w-11 flex items-center justify-center bg-slate-900 hover:bg-slate-800 text-white rounded-xl disabled:opacity-40 shrink-0">
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
