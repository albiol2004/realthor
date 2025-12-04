"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function PrivacyPolicyPage() {
  const lastUpdated = "December 4, 2025"
  const companyName = "Realthor" // Update with your legal entity name
  const companyEmail = "privacy@realthor.app" // Update with your email
  const companyAddress = "Feldbergstrasse 89, Basel, Switzerland" // Update with your address

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link href="/">
          <Button variant="ghost" className="mb-8">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-gray-500 mb-8">Last updated: {lastUpdated}</p>

        <div className="prose prose-gray dark:prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {companyName} (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy.
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information
              when you use our real estate CRM platform.
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              We comply with the General Data Protection Regulation (GDPR) and Spanish Organic Law
              3/2018 on Personal Data Protection (LOPDGDD).
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. Data Controller</h2>
            <p className="text-gray-600 dark:text-gray-400">
              <strong>Controller:</strong> {companyName}<br />
              <strong>Address:</strong> {companyAddress}<br />
              <strong>Email:</strong> {companyEmail}
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. Data We Collect</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">We collect the following categories of personal data:</p>

            <h3 className="text-lg font-medium mt-4 mb-2">3.1 Account Information</h3>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-1">
              <li>Name and email address</li>
              <li>Phone number (optional)</li>
              <li>Company name (optional)</li>
              <li>Profile picture (optional)</li>
            </ul>

            <h3 className="text-lg font-medium mt-4 mb-2">3.2 Contact Data (Your Clients)</h3>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-1">
              <li>Names, emails, phone numbers</li>
              <li>Addresses</li>
              <li>Budget preferences</li>
              <li>Notes and tags you create</li>
            </ul>

            <h3 className="text-lg font-medium mt-4 mb-2">3.3 Documents</h3>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-1">
              <li>Files you upload (contracts, IDs, etc.)</li>
              <li>OCR-extracted text for search functionality</li>
              <li>AI-generated metadata (categories, names detected)</li>
            </ul>

            <h3 className="text-lg font-medium mt-4 mb-2">3.4 Email Integration</h3>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-1">
              <li>Email account credentials (encrypted)</li>
              <li>Email content synced from your accounts</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Legal Basis for Processing</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">We process your data based on:</p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-2">
              <li><strong>Contract performance:</strong> To provide the CRM services you subscribed to</li>
              <li><strong>Legitimate interest:</strong> To improve our services and ensure security</li>
              <li><strong>Consent:</strong> For optional features like email integration</li>
              <li><strong>Legal obligation:</strong> To comply with applicable laws</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. How We Use Your Data</h2>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-2">
              <li>Provide and maintain the CRM platform</li>
              <li>Process payments and manage subscriptions</li>
              <li>Send service-related communications</li>
              <li>Provide customer support</li>
              <li>Improve and personalize our services</li>
              <li>Detect and prevent fraud or security issues</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Data Sharing</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">We share data with:</p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-2">
              <li><strong>Supabase:</strong> Database and authentication (PostgreSQL hosting)</li>
              <li><strong>Vercel:</strong> Application hosting</li>
              <li><strong>Stripe:</strong> Payment processing</li>
              <li><strong>OpenAI/Deepseek:</strong> AI features (document analysis)</li>
            </ul>
            <p className="text-gray-600 dark:text-gray-400 mt-4">
              We do not sell your personal data to third parties.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. Data Security</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">We implement industry-standard security measures:</p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-2">
              <li>Encryption at rest (database) and in transit (HTTPS/TLS)</li>
              <li>Row-Level Security (RLS) - users can only access their own data</li>
              <li>Encrypted storage of sensitive credentials (email passwords)</li>
              <li>Regular security updates and vulnerability patching</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. Your Rights (GDPR)</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">You have the right to:</p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-2">
              <li><strong>Access:</strong> Request a copy of your data</li>
              <li><strong>Rectification:</strong> Correct inaccurate data</li>
              <li><strong>Erasure:</strong> Request deletion of your data (&quot;right to be forgotten&quot;)</li>
              <li><strong>Portability:</strong> Receive your data in a portable format</li>
              <li><strong>Restriction:</strong> Limit how we process your data</li>
              <li><strong>Objection:</strong> Object to certain processing activities</li>
              <li><strong>Withdraw consent:</strong> For consent-based processing</li>
            </ul>
            <p className="text-gray-600 dark:text-gray-400 mt-4">
              To exercise these rights, contact us at <a href={`mailto:${companyEmail}`} className="text-blue-600 underline">{companyEmail}</a>.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">9. Data Retention</h2>
            <p className="text-gray-600 dark:text-gray-400">
              We retain your data for as long as your account is active or as needed to provide services.
              Upon account deletion, we will delete or anonymize your data within 30 days, unless
              retention is required by law.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">10. International Transfers</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Your data may be processed in countries outside the EEA. We ensure adequate protection
              through Standard Contractual Clauses (SCCs) or other approved mechanisms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">11. Cookies</h2>
            <p className="text-gray-600 dark:text-gray-400">
              We use essential cookies for authentication and session management.
              We do not use tracking or advertising cookies.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">12. Changes to This Policy</h2>
            <p className="text-gray-600 dark:text-gray-400">
              We may update this policy periodically. We will notify you of significant changes
              via email or in-app notification.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">13. Contact & Complaints</h2>
            <p className="text-gray-600 dark:text-gray-400">
              For privacy inquiries: <a href={`mailto:${companyEmail}`} className="text-blue-600 underline">{companyEmail}</a>
            </p>
            <p className="text-gray-600 dark:text-gray-400 mt-4">
              You also have the right to lodge a complaint with the Spanish Data Protection Agency
              (AEPD) at <a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">www.aepd.es</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
