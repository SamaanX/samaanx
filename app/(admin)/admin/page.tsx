import { AdminDashboardClient } from "@/features/admin/components/admin-dashboard-client";
import {
  getAdminDashboardStats,
  getAdminGrowthSeries,
  getAdminRecentActivity,
} from "@/features/admin/queries/dashboard-stats";

export default async function AdminDashboardPage() {
  const [stats, growth, recent] = await Promise.all([
    getAdminDashboardStats(),
    getAdminGrowthSeries(30),
    getAdminRecentActivity(),
  ]);

  return <AdminDashboardClient stats={stats} growth={growth} recent={recent} />;
}
