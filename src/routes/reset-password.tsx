import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset password — Lumen" }, { name: "robots", content: "noindex" }] }),
  component: ResetPage,
});

function ResetPage() {
  const nav = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (password.length < 8) throw new Error("Password must be at least 8 characters");
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated");
      nav({ to: "/home", replace: true });
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to update password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell hideFooter>
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 pb-16 pt-28">
        <div className="rounded-3xl border border-white/5 glass p-8 shadow-[var(--shadow-elevated)]">
          <h1 className="text-2xl font-semibold tracking-tight">Set a new password</h1>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="pw">New password</Label>
              <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
            </div>
            <Button type="submit" disabled={busy} className="w-full rounded-full bg-brand text-brand-foreground hover:bg-brand/90">
              {busy ? "Saving…" : "Update password"}
            </Button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}