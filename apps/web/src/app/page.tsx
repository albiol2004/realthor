import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Image from 'next/image'
import { ArrowRight, Sparkles, Zap, Shield, TrendingUp, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default async function HomePage() {
  // Check if user is authenticated
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Redirect to dashboard if already logged in
  if (user) {
    redirect('/dashboard')
  }

  // JSON-LD structured data for SEO
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Realthor',
    applicationCategory: 'BusinessApplication',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'EUR',
    },
    description: 'Complete real estate Operating System for agents and agencies. CRM, Document Intelligence, Compliance Tracking, and Unified Communications.',
    operatingSystem: 'Web',
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '5',
      ratingCount: '1',
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <div className="relative min-h-screen bg-black text-white overflow-hidden">
        {/* Animated Background Grid */}
        <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-900 to-black">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
        </div>

        {/* Floating Gradient Orbs */}
        <div className="absolute top-1/4 -left-48 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse delay-1000" />

        {/* Main Content */}
        <div className="relative z-10">
          {/* Navigation */}
          <nav className="container mx-auto px-6 py-8 flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="relative w-10 h-10">
                <Image
                  src="/images/KairoLogo.jpeg"
                  alt="Realthor"
                  fill
                  className="object-contain"
                />
              </div>
              <span className="text-2xl font-bold tracking-tight">Realthor Solutions</span>
            </div>
            <Link href="/login">
              <Button variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10 text-white">
                Sign In
              </Button>
            </Link>
          </nav>

          {/* Hero Section */}
          <section className="container mx-auto px-6 pt-20 pb-32">
            <div className="max-w-5xl mx-auto text-center space-y-8">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-medium">Built Exclusively for Real Estate Professionals</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-6xl md:text-8xl font-bold tracking-tight leading-tight">
                Your Real Estate
                <br />
                <span className="bg-gradient-to-r from-white via-gray-200 to-white bg-clip-text text-transparent animate-gradient">
                  Operating System
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
                The only platform real estate agents need. Manage clients, ensure compliance,
                organize documents, and close deals. All in one place.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
                <Link href="/login">
                  <Button
                    size="lg"
                    className="bg-white text-black hover:bg-gray-200 text-lg px-8 py-6 rounded-full group"
                  >
                    Get Started
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button
                    size="lg"
                    variant="outline"
                    className="bg-white/5 border-white/10 hover:bg-white/10 text-white text-lg px-8 py-6 rounded-full"
                  >
                    Try for Free
                  </Button>
                </Link>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-8 pt-16 max-w-2xl mx-auto">
                <div className="space-y-1">
                  <div className="text-3xl font-bold">All-in-One</div>
                  <div className="text-sm text-gray-500">Platform</div>
                </div>
                <div className="space-y-1">
                  <div className="text-3xl font-bold">100%</div>
                  <div className="text-sm text-gray-500">Compliant</div>
                </div>
                <div className="space-y-1">
                  <div className="text-3xl font-bold">Cloud</div>
                  <div className="text-sm text-gray-500">Storage</div>
                </div>
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section className="container mx-auto px-6 py-32">
            <div className="max-w-6xl mx-auto">
              <div className="text-center space-y-4 mb-20">
                <h2 className="text-4xl md:text-6xl font-bold tracking-tight">
                  Everything you need.
                  <br />
                  Nothing you don't.
                </h2>
                <p className="text-xl text-gray-400">
                  A complete workspace designed exclusively for real estate agents and agencies
                </p>
              </div>

              {/* Feature Grid */}
              <div className="grid md:grid-cols-3 gap-8">
                {/* Feature 1 */}
                <div className="group relative p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Zap className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">Complete CRM</h3>
                  <p className="text-gray-400 leading-relaxed">
                    Track clients, properties, and deals with assisted workflows that guide you to close faster and stay organized.
                  </p>
                </div>

                {/* Feature 2 */}
                <div className="group relative p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Shield className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">Document Intelligence</h3>
                  <p className="text-gray-400 leading-relaxed">
                    Every document knows where it belongs. Automatic categorization ensures full compliance and tells you exactly what's missing.
                  </p>
                </div>

                {/* Feature 3 */}
                <div className="group relative p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">Unified Communications</h3>
                  <p className="text-gray-400 leading-relaxed">
                    All client conversations in one place. Email, WhatsApp, and SMS integrated with secure cloud storage for every interaction.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Demo Video Section */}
          <section className="container mx-auto px-6 py-32">
            <div className="max-w-5xl mx-auto">
              <div className="text-center space-y-4 mb-12">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
                  <Play className="w-4 h-4" />
                  <span className="text-sm font-medium">See it in action</span>
                </div>
                <h2 className="text-4xl md:text-6xl font-bold tracking-tight">
                  Watch the Demo
                </h2>
                <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                  See how Realthor streamlines your real estate workflow in just a few minutes
                </p>
              </div>

              {/* Video Container */}
              <div className="relative rounded-3xl overflow-hidden bg-white/5 border border-white/10 backdrop-blur-sm">
                <div className="aspect-video">
                  <video
                    className="w-full h-full object-cover"
                    controls
                    preload="metadata"
                    poster=""
                  >
                    <source src="https://alejandrogarcia.blog/videos/DemoRealthor.mp4" type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
              </div>
            </div>
          </section>

          {/* Final CTA */}
          <section className="container mx-auto px-6 py-32">
            <div className="max-w-4xl mx-auto text-center space-y-8">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 blur-3xl" />
                <h2 className="relative text-5xl md:text-7xl font-bold tracking-tight">
                  The only app
                  <br />
                  you'll ever need
                </h2>
              </div>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                Join real estate professionals who manage everything in one place.
                Import your existing documents and start working smarter today.
              </p>
              <Link href="/login">
                <Button
                  size="lg"
                  className="bg-white text-black hover:bg-gray-200 text-xl px-12 py-8 rounded-full group"
                >
                  Start Free Trial
                  <ArrowRight className="ml-2 w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </section>

          {/* Footer */}
          <footer className="container mx-auto px-6 py-12 border-t border-white/10">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center space-x-3">
                <div className="relative w-8 h-8">
                  <Image
                    src="/images/KairoLogo.jpeg"
                    alt="Realthor"
                    fill
                    className="object-contain"
                  />
                </div>
                <span className="text-xl font-bold">Realthor Solutions</span>
              </div>
              <div className="flex items-center gap-6 text-sm text-gray-400">
                <Link href="/privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
                <Link href="/terms" className="hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </div>
              <p className="text-gray-500 text-sm">
                © 2025 Realthor Solutions. The operating system for real estate professionals.
              </p>
            </div>
          </footer>
        </div>
      </div>
    </>
  )
}
