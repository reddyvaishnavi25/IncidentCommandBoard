"use client";

import { useState, useEffect } from "react";
import { Shield, Radio, Database, Users } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { login } from "@/lib/actions/auth-actions";
import { roleLabel } from "@/lib/utils";

interface DemoUser {
  id: string;
  email: string;
  name: string;
  role: string;
  agencyName: string;
}

export default function LoginPage() {
  const [demoUsers, setDemoUsers] = useState<DemoUser[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/demo-users")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setDemoUsers(data);
      })
      .catch(() => {});
  }, []);

  async function handleLogin(email: string, password: string) {
    setLoading(true);
    setError("");
    const fd = new FormData();
    fd.set("email", email);
    fd.set("password", password);
    try {
      const result = await login(fd);
      if (result && !result.success) setError(result.message ?? "Login failed");
    } catch {
      /* redirect on success */
    }
    setLoading(false);
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 grid-bg">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/20 via-transparent to-purple-950/20" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md p-6"
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-600/20 ring-1 ring-cyan-500/30">
            <Shield className="h-8 w-8 text-cyan-400" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-100">CRISIS TWIN</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Real-Time Digital Twin for Multi-Agency Emergency Response
          </p>
          <div className="mt-4 flex items-center justify-center gap-4 text-xs text-zinc-500">
            <span className="flex items-center gap-1">
              <Database className="h-3 w-3 text-cyan-500" /> Aurora DSQL
            </span>
            <span className="flex items-center gap-1">
              <Radio className="h-3 w-3 text-emerald-500" /> Strong Consistency
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-6 backdrop-blur-sm shadow-2xl">
          <form
            action={async (fd) => {
              setLoading(true);
              setError("");
              try {
                const result = await login(fd);
                if (result && !result.success) setError(result.message ?? "Login failed");
              } catch {
                /* redirect */
              }
              setLoading(false);
            }}
            className="space-y-4"
          >
            <Input name="email" type="email" placeholder="Email" required />
            <Input name="password" type="password" placeholder="Password" defaultValue="demo123" required />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              Sign In to EOC
            </Button>
          </form>

          {demoUsers.length > 0 && (
            <div className="mt-6 border-t border-zinc-800 pt-6">
              <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-wider text-zinc-500">
                <Users className="h-3 w-3" />
                Demo — Open 5 windows, one per role
              </div>
              <div className="space-y-2">
                {demoUsers.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleLogin(u.email, "demo123")}
                    disabled={loading}
                    className="flex w-full items-center justify-between rounded-md bg-zinc-900/80 px-3 py-2.5 text-left text-sm transition-colors hover:bg-zinc-800 ring-1 ring-zinc-800"
                  >
                    <div>
                      <p className="font-medium text-zinc-200">{u.name}</p>
                      <p className="text-xs text-zinc-500">{u.agencyName}</p>
                    </div>
                    <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                      {roleLabel(u.role)}
                    </span>
                  </button>
                ))}
              </div>
              <p className="mt-3 text-center text-[10px] text-zinc-600">
                Password for all demo accounts: demo123
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
