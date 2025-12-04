import { Phone, Mail } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * Contact Us Page
 *
 * Support and contact information
 */
export default function ContactPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-black dark:text-white">
          Contact Us
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Get in touch with our support team
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 max-w-2xl">
        <Card className="border-gray-200 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-black dark:text-white">
              <Mail className="h-5 w-5" />
              Email Support
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              Send us an email and we'll get back to you within 24 hours.
            </p>
            <a
              href="mailto:support@realthor.app"
              className="text-purple-600 dark:text-purple-400 hover:underline"
            >
              support@realthor.app
            </a>
          </CardContent>
        </Card>

        <Card className="border-gray-200 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-black dark:text-white">
              <Phone className="h-5 w-5" />
              Phone Support
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              Call us during business hours (9 AM - 6 PM EST).
            </p>
            <a
              href="tel:+1234567890"
              className="text-purple-600 dark:text-purple-400 hover:underline"
            >
              +1 (234) 567-890
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
