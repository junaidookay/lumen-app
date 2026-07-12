import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, User, Settings, Bell, Bookmark, Heart, History, PlayCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { getProfile, listNotifications } from "@/services/library";

export function AccountMenu() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data: profile } = useQuery({ queryKey: ["profile", user?.id], queryFn: () => getProfile(user!.id), enabled: !!user });
  const { data: notifs } = useQuery({ queryKey: ["notifications"], queryFn: listNotifications, enabled: !!user });
  const unread = (notifs ?? []).filter((n) => !n.read).length;
  if (loading) return <div className="h-10 w-10 rounded-full glass" />;
  if (!user) {
    return <Link to="/auth" className="hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium transition hover:bg-white/10 sm:inline-block">Sign in</Link>;
  }
  const name = profile?.display_name || profile?.username || user.email?.split("@")[0] || "You";
  const initials = name.slice(0, 2).toUpperCase();
  async function signOut() { await qc.cancelQueries(); qc.clear(); await supabase.auth.signOut(); nav({ to: "/auth", replace: true }); }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative grid h-10 w-10 place-items-center rounded-full glass hover:bg-white/10" aria-label="Account">
          <Avatar className="h-9 w-9"><AvatarImage src={profile?.avatar_url ?? undefined} /><AvatarFallback className="text-xs">{initials}</AvatarFallback></Avatar>
          {unread > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-semibold text-brand-foreground">{unread > 9 ? "9+" : unread}</span>}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel><div className="flex flex-col"><span className="text-sm font-medium">{name}</span><span className="truncate text-xs text-muted-foreground">{user.email}</span></div></DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => nav({ to: "/library" })}><Bookmark className="mr-2 h-4 w-4" /> Watchlist</DropdownMenuItem>
        <DropdownMenuItem onClick={() => nav({ to: "/library/favorites" })}><Heart className="mr-2 h-4 w-4" /> Favorites</DropdownMenuItem>
        <DropdownMenuItem onClick={() => nav({ to: "/library/continue" })}><PlayCircle className="mr-2 h-4 w-4" /> Continue watching</DropdownMenuItem>
        <DropdownMenuItem onClick={() => nav({ to: "/library/history" })}><History className="mr-2 h-4 w-4" /> History</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => nav({ to: "/notifications" })}><Bell className="mr-2 h-4 w-4" /> Notifications {unread > 0 && <span className="ml-auto rounded-full bg-brand px-1.5 text-[10px] text-brand-foreground">{unread}</span>}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => nav({ to: "/profile" })}><User className="mr-2 h-4 w-4" /> Profile</DropdownMenuItem>
        <DropdownMenuItem onClick={() => nav({ to: "/settings" })}><Settings className="mr-2 h-4 w-4" /> Settings</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut} className="text-red-400 focus:text-red-400"><LogOut className="mr-2 h-4 w-4" /> Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}