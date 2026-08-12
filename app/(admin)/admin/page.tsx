import { Suspense } from "react";

import { AdminDashboardClient } from "@/features/admin/components/admin-dashboard-client";
import { AdminPageSkeleton } from "@/features/admin/components/admin-page-skeleton";
import {
  getAdminDashboardStats,
  getAdminGrowthSeries,
  getAdminRecentActivity,
} from "@/features/admin/queries/dashboard-stats";

async function AdminDashboardContent() {
  const [stats, growth, recent] = await Promise.all([
    getAdminDashboardStats(),
    getAdminGrowthSeries(30),
    getAdminRecentActivity(),
  ]);

  return <AdminDashboardClient stats={stats} growth={growth} recent={recent} />;
}

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<AdminPageSkeleton />}>
      <AdminDashboardContent />
    </Suspense>
  );
}
