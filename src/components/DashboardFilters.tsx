import type { StudentStatus } from "@/types/student";
import { Button } from "@/components/ui/button";

interface DashboardFiltersProps {
  active: StudentStatus | "all" | "inactive";
  onChange: (filter: StudentStatus | "all" | "inactive") => void;
  counts: Record<StudentStatus | "all" | "inactive", number>;
}

const filters: { key: StudentStatus | "all" | "inactive"; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "overdue", label: "Atrasados" },
  { key: "due-soon", label: "Vencendo" },
  { key: "pending", label: "Em dia" },
  { key: "paid", label: "Pagos" },
  { key: "inactive", label: "Inativos" },
];

export function DashboardFilters({
  active,
  onChange,
  counts,
}: DashboardFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((f) => {
        const isActive = active === f.key;
        const dotColor =
          f.key === "overdue"
            ? "bg-status-overdue"
            : f.key === "due-soon"
              ? "bg-status-due-soon"
              : f.key === "paid"
                ? "bg-status-paid"
                : f.key === "pending"
                  ? "bg-status-pending"
                  : f.key === "inactive"
                    ? "bg-muted-foreground"
                    : "bg-foreground";

        return (
          <Button
            key={f.key}
            variant={isActive ? "default" : "outline"}
            size="sm"
            onClick={() => onChange(f.key)}
            className="gap-1.5"
          >
            {f.key !== "all" && f.key !== "inactive" && (
              <span className={`h-2 w-2 rounded-full ${dotColor}`} />
            )}
            {f.key === "inactive" && (
              <span className={`h-2 w-2 rounded-full ${dotColor}`} />
            )}
            {f.label}
            <span
              className={`ml-0.5 text-xs ${isActive ? "opacity-80" : "text-muted-foreground"}`}
            >
              {counts[f.key]}
            </span>
          </Button>
        );
      })}
    </div>
  );
}
