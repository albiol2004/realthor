/**
 * Dashboard Layout
 *
 * Wraps all protected dashboard pages
 * Will include: header, sidebar, navigation
 * Phase 1: Basic structure, will enhance in later phases
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* TODO Phase 1: Add header */}
      {/* TODO Phase 1: Add sidebar */}
      <main className="container mx-auto p-6">
        {children}
      </main>
    </div>
  )
}
