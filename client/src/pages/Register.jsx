import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { Mail, Lock, User, MessageCircle } from "lucide-react";

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, displayName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");
      login(data.token, data.user);
      navigate("/chat");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200" />
          <div className="p-8 sm:p-10">
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-300 rounded-full blur-xl opacity-30" />
                <div className="relative h-20 w-20 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shadow-lg ring-4 ring-white/50">
                  <MessageCircle className="h-10 w-10 text-white" />
                </div>
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Create your account</h1>
                <p className="text-slate-500 text-sm sm:text-base font-medium">Join PrcChat today</p>
              </div>
              {error && (
                <div className="w-full bg-red-50 text-red-600 text-sm rounded-lg px-4 py-2.5">{error}</div>
              )}
              <form onSubmit={handleSubmit} className="w-full space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Display name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                      type="text" placeholder="Your name" value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full h-11 pl-10 pr-3 rounded-xl bg-slate-50/50 border border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-400 outline-none placeholder:text-slate-400"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                      type="email" placeholder="you@example.com" required value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-11 pl-10 pr-3 rounded-xl bg-slate-50/50 border border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-400 outline-none placeholder:text-slate-400"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                      type="password" placeholder="••••••••" required value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-11 pl-10 pr-3 rounded-xl bg-slate-50/50 border border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-400 outline-none placeholder:text-slate-400"
                    />
                  </div>
                </div>
                <button
                  type="submit" disabled={loading}
                  className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl shadow-sm transition-all disabled:opacity-50"
                >
                  {loading ? "Creating account…" : "Sign up"}
                </button>
              </form>
              <p className="text-sm text-slate-500">
                Already have an account?{" "}
                <Link to="/login" className="font-medium text-slate-700 hover:text-slate-900">Sign in</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
