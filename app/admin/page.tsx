import { AdminDashboard } from "@/components/AdminDashboard";

export const metadata = {
  title: "SignDay Admin",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <AdminDashboard />
    </main>
  );
}
