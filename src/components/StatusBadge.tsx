import type { StudentStatus } from "@/types/student";
import { getStatusLabel } from "@/utils/billing";

interface StatusBadgeProps {
  status: StudentStatus;
  daysOverdue?: number;
}

export function StatusBadge({ status, daysOverdue }: StatusBadgeProps) {
  const styles: Record<StudentStatus, string> = {
    paid: "bg-status-paid-bg text-status-paid",
    pending: "bg-secondary text-muted-foreground",
    overdue: "bg-status-overdue-bg text-status-overdue",
    "due-soon": "bg-status-due-soon-bg text-status-due-soon",
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${styles[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${
        status === "paid" ? "bg-status-paid" :
        status === "overdue" ? "bg-status-overdue" :
        status === "due-soon" ? "bg-status-due-soon" :
        "bg-muted-foreground"
      }`} />
      {getStatusLabel(status)}
      {status === "overdue" && daysOverdue ? ` (${daysOverdue}d)` : ""}
    </span>
  );
}
