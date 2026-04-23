import type { StudentWithStatus } from "@/types/student";

interface StatsCardsProps {
  students: StudentWithStatus[];
}

export function StatsCards({ students }: StatsCardsProps) {
  const total = students.length;
  const paid = students.filter((s) => s.status === "paid").length;
  const overdue = students.filter((s) => s.status === "overdue").length;
  const dueSoon = students.filter((s) => s.status === "due-soon").length;
  const pending = students.filter((s) => s.status === "pending").length;

  const stats = [
    {
      label: "Total Alunos",
      value: total,
      color: "text-foreground",
      bg: "bg-secondary",
    },
    {
      label: "Pagos",
      value: paid,
      color: "text-status-paid",
      bg: "bg-status-paid-bg",
    },
    {
      label: "Vencendo",
      value: dueSoon,
      color: "text-status-due-soon",
      bg: "bg-status-due-soon-bg",
    },
    {
      label: "Em dia",
      value: pending,
      color: "text-status-pending",
      bg: "bg-status-pending-bg",
    },
    {
      label: "Atrasados",
      value: overdue,
      color: "text-status-overdue",
      bg: "bg-status-overdue-bg",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {stats.map((s) => (
        <div key={s.label} className={`rounded-xl ${s.bg} p-4`}>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {s.label}
          </p>
          <p className={`text-3xl font-heading mt-1 ${s.color}`}>{s.value}</p>
        </div>
      ))}
    </div>
  );
}
