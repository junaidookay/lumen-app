import type { CrewMember } from "@/types/media";

export function CrewCard({ member }: { member: CrewMember }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-surface/50 p-3">
      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-surface-elevated">
        {member.photo && <img src={member.photo} alt="" className="h-full w-full object-cover" />}
      </div>
      <div className="min-w-0">
        <p className="line-clamp-1 text-sm font-medium">{member.name}</p>
        <p className="line-clamp-1 text-xs text-muted-foreground">{member.role}</p>
      </div>
    </div>
  );
}