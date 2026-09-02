import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { ArrowLeft, Save } from "lucide-react";

export default function Profile() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(user?.display_name || "");
  const [statusMessage, setStatusMessage] = useState(user?.status_message || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!user) return null;

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    const token = localStorage.getItem("token");
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ display_name: displayName, status_message: statusMessage }),
    });
    const data = await res.json();
    if (res.ok) {
      setUser(data.user);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate("/chat")} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-semibold text-slate-800">Profile</h1>
      </header>

      <div className="max-w-md mx-auto p-4 pt-8">
        {/* Avatar */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-24 w-24 rounded-full flex items-center justify-center shadow-lg ring-4 ring-white" style={{ background: user.avatar_color }}>
            <span className="text-white font-bold text-3xl">{(displayName || user.email)[0].toUpperCase()}</span>
          </div>
          <p className="mt-3 text-slate-400 text-sm">{user.email}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Display name</label>
            <input
              type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name"
              className="w-full h-11 px-4 rounded-xl bg-slate-50/50 border border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-400 outline-none text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Status message</label>
            <input
              type="text" value={statusMessage} onChange={(e) => setStatusMessage(e.target.value)} placeholder="What's on your mind?"
              className="w-full h-11 px-4 rounded-xl bg-slate-50/50 border border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-400 outline-none text-sm"
            />
          </div>
          <button
            type="submit" disabled={saving}
            className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving…" : saved ? "Saved!" : "Save changes"}
          </button>
        </form>

        <button
          onClick={() => { logout(); navigate("/login"); }}
          className="w-full mt-6 h-11 text-red-500 hover:text-red-600 font-medium text-sm flex items-center justify-center gap-2"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
