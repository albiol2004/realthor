export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="space-y-6 text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          Welcome to Kairo
        </h1>
        <p className="text-xl text-muted-foreground">
          The Operating System for Real Estate Professionals
        </p>
        <div className="flex gap-4 justify-center pt-4">
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <h3 className="font-semibold mb-2">Next.js</h3>
            <p className="text-sm text-muted-foreground"> Configured</p>
          </div>
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <h3 className="font-semibold mb-2">TypeScript</h3>
            <p className="text-sm text-muted-foreground"> Configured</p>
          </div>
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <h3 className="font-semibold mb-2">Tailwind</h3>
            <p className="text-sm text-muted-foreground"> Configured</p>
          </div>
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <h3 className="font-semibold mb-2">shadcn/ui</h3>
            <p className="text-sm text-muted-foreground"> Configured</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground pt-6">
          Phase 1: Foundation - Ready to Build
        </p>
      </div>
    </main>
  )
}
