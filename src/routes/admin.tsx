import { createFileRoute, Outlet, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { Header } from "@/components/Header";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/admin")({ ssr: false, component: AdminLayout });

function AdminLayout() {
  const { isAdmin, loading, user } = useAuth();
  const navigate = useNavigate();
  const { t } = useI18n();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/auth" });
    else if (!isAdmin) navigate({ to: "/" });
  }, [loading, user, isAdmin, navigate]);

  if (loading || !isAdmin) return <div className="min-h-screen bg-background"><Header /></div>;

  const tabs = [
    { to: "/admin", label: t("adminOrders") },
    { to: "/admin/products", label: t("adminProducts") },
    { to: "/admin/customers", label: t("adminCustomers") },
    { to: "/admin/award", label: t("adminAward") },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="border-b bg-card">
        <div className="mx-auto max-w-5xl px-4 flex gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const active = location.pathname === tab.to;
            return (
              <Link key={tab.to} to={tab.to}
                className={`whitespace-nowrap py-3 px-3 text-sm font-medium border-b-2 transition-colors ${active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
      <Outlet />
    </div>
  );
}
