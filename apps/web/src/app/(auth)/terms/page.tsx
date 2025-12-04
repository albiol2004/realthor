"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function TermsOfServicePage() {
  const lastUpdated = "December 4, 2025"
  const companyName = "Realthor" // Update with your legal entity name
  const companyEmail = "legal@realthor.app" // Update with your email

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link href="/">
          <Button variant="ghost" className="mb-8">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
        <p className="text-gray-500 mb-8">Last updated: {lastUpdated}</p>

        <div className="prose prose-gray dark:prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-600 dark:text-gray-400">
              By accessing or using {companyName} (&quot;the Service&quot;), you agree to be bound by these
              Terms of Service. If you do not agree to these terms, do not use the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
            <p className="text-gray-600 dark:text-gray-400">
              {companyName} is a customer relationship management (CRM) platform designed for
              real estate professionals. The Service includes contact management, document storage,
              email integration, property management, and related features.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. Account Registration</h2>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-2">
              <li>You must provide accurate and complete information during registration</li>
              <li>You are responsible for maintaining the security of your account credentials</li>
              <li>You must notify us immediately of any unauthorized use of your account</li>
              <li>You must be at least 18 years old to use the Service</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Subscription and Payment</h2>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-2">
              <li>The Service offers a 7-day free trial for new users</li>
              <li>After the trial, a paid subscription is required for continued access</li>
              <li>Subscription fees are billed in advance on a monthly, quarterly, or yearly basis</li>
              <li>All fees are non-refundable unless otherwise stated</li>
              <li>We reserve the right to change pricing with 30 days notice</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Your Data</h2>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-2">
              <li>You retain ownership of all data you upload to the Service</li>
              <li>You grant us a license to process your data solely to provide the Service</li>
              <li>You are responsible for ensuring you have the right to upload any data</li>
              <li>You are responsible for compliance with data protection laws for data you collect from your clients</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Acceptable Use</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">You agree NOT to:</p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-2">
              <li>Use the Service for any illegal purpose</li>
              <li>Upload malicious content or attempt to compromise our systems</li>
              <li>Share account credentials with unauthorized users</li>
              <li>Resell or redistribute the Service without permission</li>
              <li>Scrape, crawl, or extract data from the Service</li>
              <li>Interfere with other users&apos; use of the Service</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. AI Features</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              The Service includes AI-powered features for document analysis and contact matching.
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-2">
              <li>AI outputs are provided as suggestions and may contain errors</li>
              <li>You are responsible for verifying AI-generated information</li>
              <li>Document content may be processed by third-party AI providers</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. Intellectual Property</h2>
            <p className="text-gray-600 dark:text-gray-400">
              The Service, including its design, features, and code, is owned by {companyName}.
              You may not copy, modify, or reverse engineer any part of the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">9. Service Availability</h2>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-2">
              <li>We strive for high availability but do not guarantee 100% uptime</li>
              <li>We may perform maintenance that temporarily affects availability</li>
              <li>We are not liable for service interruptions beyond our control</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">10. Limitation of Liability</h2>
            <p className="text-gray-600 dark:text-gray-400">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, {companyName.toUpperCase()} SHALL NOT BE LIABLE FOR
              ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING
              LOSS OF PROFITS, DATA, OR BUSINESS OPPORTUNITIES.
            </p>
            <p className="text-gray-600 dark:text-gray-400 mt-4">
              Our total liability shall not exceed the amount you paid for the Service in the
              12 months preceding the claim.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">11. Disclaimer of Warranties</h2>
            <p className="text-gray-600 dark:text-gray-400">
              THE SERVICE IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED,
              INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
              PURPOSE, AND NON-INFRINGEMENT.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">12. Termination</h2>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-2">
              <li>You may cancel your subscription at any time</li>
              <li>We may suspend or terminate your account for violation of these terms</li>
              <li>Upon termination, your data will be deleted within 30 days</li>
              <li>You may request a data export before account deletion</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">13. Changes to Terms</h2>
            <p className="text-gray-600 dark:text-gray-400">
              We may modify these terms at any time. We will notify you of significant changes
              via email or in-app notification. Continued use of the Service after changes
              constitutes acceptance of the new terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">14. Governing Law</h2>
            <p className="text-gray-600 dark:text-gray-400">
              These terms are governed by the laws of Spain. Any disputes shall be resolved
              in the courts of Spain.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">15. Contact</h2>
            <p className="text-gray-600 dark:text-gray-400">
              For questions about these terms, contact us at{" "}
              <a href={`mailto:${companyEmail}`} className="text-blue-600 underline">{companyEmail}</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
