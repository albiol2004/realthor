import type { DocumentType } from '@/types/crm'

/**
 * Contact Compliance Requirements Configuration
 * Based on the contact's role in transactions
 */

export type ContactRole = 'buyer' | 'seller' | 'lender' | 'tenant' | 'landlord' | 'other'

export interface ContactDocumentRequirement {
  documentType: DocumentType
  name: string
  description: string
  importance: 'CRITICAL' | 'RECOMMENDED' | 'OPTIONAL'
}

export interface ContactRoleRequirements {
  role: ContactRole
  label: string
  description: string
  critical: ContactDocumentRequirement[]
  recommended: ContactDocumentRequirement[]
  optional: ContactDocumentRequirement[]
}

/**
 * Compliance scoring weights for contacts
 */
export const CONTACT_COMPLIANCE_WEIGHTS = {
  CRITICAL: 50,      // 50% weight
  RECOMMENDED: 30,   // 30% weight
  OPTIONAL: 20,      // 20% weight
} as const

/**
 * Contact role compliance requirements
 */
export const CONTACT_COMPLIANCE_REQUIREMENTS: Record<ContactRole, ContactRoleRequirements> = {
  buyer: {
    role: 'buyer',
    label: 'Buyer',
    description: 'Documents required for property buyers',
    critical: [
      {
        documentType: 'dni_nie_passport',
        name: 'DNI/NIE/Passport',
        description: 'Valid identification document',
        importance: 'CRITICAL',
      },
      {
        documentType: 'kyc_form',
        name: 'KYC Form',
        description: 'Anti-Money Laundering compliance',
        importance: 'CRITICAL',
      },
      {
        documentType: 'proof_of_funds',
        name: 'Proof of Funds',
        description: 'Bank statements or financing pre-approval',
        importance: 'CRITICAL',
      },
    ],
    recommended: [
      {
        documentType: 'tax_returns',
        name: 'Tax Returns',
        description: 'Last 2 years for mortgage approval',
        importance: 'RECOMMENDED',
      },
      {
        documentType: 'payslips',
        name: 'Payslips',
        description: 'Last 3-6 months',
        importance: 'RECOMMENDED',
      },
    ],
    optional: [
      {
        documentType: 'power_of_attorney',
        name: 'Power of Attorney',
        description: 'If acting through representative',
        importance: 'OPTIONAL',
      },
    ],
  },

  seller: {
    role: 'seller',
    label: 'Seller',
    description: 'Documents required for property sellers',
    critical: [
      {
        documentType: 'dni_nie_passport',
        name: 'DNI/NIE/Passport',
        description: 'Valid identification document',
        importance: 'CRITICAL',
      },
      {
        documentType: 'title_deed',
        name: 'Title Deed',
        description: 'Proof of ownership',
        importance: 'CRITICAL',
      },
      {
        documentType: 'nota_simple',
        name: 'Nota Simple',
        description: 'Recent registry note (<3 months)',
        importance: 'CRITICAL',
      },
    ],
    recommended: [
      {
        documentType: 'ibi_receipt',
        name: 'IBI Receipt',
        description: 'Property tax receipts',
        importance: 'RECOMMENDED',
      },
      {
        documentType: 'community_debt_certificate',
        name: 'Community Debt Certificate',
        description: 'Proof of no outstanding community fees',
        importance: 'RECOMMENDED',
      },
    ],
    optional: [
      {
        documentType: 'power_of_attorney',
        name: 'Power of Attorney',
        description: 'If acting through representative',
        importance: 'OPTIONAL',
      },
    ],
  },

  tenant: {
    role: 'tenant',
    label: 'Tenant',
    description: 'Documents required for property tenants',
    critical: [
      {
        documentType: 'dni_nie_passport',
        name: 'DNI/NIE/Passport',
        description: 'Valid identification document',
        importance: 'CRITICAL',
      },
      {
        documentType: 'payslips',
        name: 'Payslips',
        description: 'Last 3-6 months for income verification',
        importance: 'CRITICAL',
      },
    ],
    recommended: [
      {
        documentType: 'tax_returns',
        name: 'Tax Returns',
        description: 'Additional income proof',
        importance: 'RECOMMENDED',
      },
      {
        documentType: 'rental_contract',
        name: 'Previous Rental Contract',
        description: 'Rental history',
        importance: 'RECOMMENDED',
      },
    ],
    optional: [
      {
        documentType: 'utility_bills',
        name: 'Utility Bills',
        description: 'Proof of current address',
        importance: 'OPTIONAL',
      },
    ],
  },

  landlord: {
    role: 'landlord',
    label: 'Landlord',
    description: 'Documents required for property landlords',
    critical: [
      {
        documentType: 'dni_nie_passport',
        name: 'DNI/NIE/Passport',
        description: 'Valid identification document',
        importance: 'CRITICAL',
      },
      {
        documentType: 'title_deed',
        name: 'Title Deed',
        description: 'Proof of ownership',
        importance: 'CRITICAL',
      },
      {
        documentType: 'energy_certificate',
        name: 'Energy Certificate',
        description: 'Required for rental listings',
        importance: 'CRITICAL',
      },
      {
        documentType: 'habitability_certificate',
        name: 'Habitability Certificate',
        description: 'Cédula de Habitabilidad',
        importance: 'CRITICAL',
      },
    ],
    recommended: [
      {
        documentType: 'community_debt_certificate',
        name: 'Community Debt Certificate',
        description: 'No outstanding fees',
        importance: 'RECOMMENDED',
      },
      {
        documentType: 'ibi_receipt',
        name: 'IBI Receipt',
        description: 'Property tax receipts',
        importance: 'RECOMMENDED',
      },
    ],
    optional: [
      {
        documentType: 'rent_default_insurance',
        name: 'Rent Default Insurance',
        description: 'Protection against non-payment',
        importance: 'OPTIONAL',
      },
    ],
  },

  lender: {
    role: 'lender',
    label: 'Lender/Financier',
    description: 'Documents required for lenders',
    critical: [
      {
        documentType: 'company_deeds',
        name: 'Company Deeds',
        description: 'If corporate entity',
        importance: 'CRITICAL',
      },
      {
        documentType: 'cif',
        name: 'CIF',
        description: 'Company tax ID',
        importance: 'CRITICAL',
      },
      {
        documentType: 'administrator_id',
        name: 'Administrator ID',
        description: 'Legal representative identification',
        importance: 'CRITICAL',
      },
    ],
    recommended: [],
    optional: [],
  },

  other: {
    role: 'other',
    label: 'Other',
    description: 'General contact - no specific requirements',
    critical: [
      {
        documentType: 'dni_nie_passport',
        name: 'DNI/NIE/Passport',
        description: 'Basic identification',
        importance: 'CRITICAL',
      },
    ],
    recommended: [],
    optional: [],
  },
}

/**
 * Calculate compliance score for a contact based on their role and documents
 */
export function calculateContactCompliance(
  role: ContactRole | undefined,
  documents: Array<{ documentType?: DocumentType }>
): {
  score: number
  critical: { completed: number; total: number }
  recommended: { completed: number; total: number }
  optional: { completed: number; total: number }
  missingCritical: ContactDocumentRequirement[]
  missingRecommended: ContactDocumentRequirement[]
  missingOptional: ContactDocumentRequirement[]
} {
  // If no role assigned, return 0
  if (!role) {
    return {
      score: 0,
      critical: { completed: 0, total: 0 },
      recommended: { completed: 0, total: 0 },
      optional: { completed: 0, total: 0 },
      missingCritical: [],
      missingRecommended: [],
      missingOptional: [],
    }
  }

  const requirements = CONTACT_COMPLIANCE_REQUIREMENTS[role]
  const documentTypes = new Set(documents.map(d => d.documentType).filter(Boolean))

  // Count completed requirements by category
  const criticalCompleted = requirements.critical.filter(
    req => documentTypes.has(req.documentType)
  ).length
  const recommendedCompleted = requirements.recommended.filter(
    req => documentTypes.has(req.documentType)
  ).length
  const optionalCompleted = requirements.optional.filter(
    req => documentTypes.has(req.documentType)
  ).length

  // Calculate weighted score
  const criticalScore = requirements.critical.length > 0
    ? (criticalCompleted / requirements.critical.length) * CONTACT_COMPLIANCE_WEIGHTS.CRITICAL
    : CONTACT_COMPLIANCE_WEIGHTS.CRITICAL // If no critical docs required, give full credit
  const recommendedScore = requirements.recommended.length > 0
    ? (recommendedCompleted / requirements.recommended.length) * CONTACT_COMPLIANCE_WEIGHTS.RECOMMENDED
    : CONTACT_COMPLIANCE_WEIGHTS.RECOMMENDED
  const optionalScore = requirements.optional.length > 0
    ? (optionalCompleted / requirements.optional.length) * CONTACT_COMPLIANCE_WEIGHTS.OPTIONAL
    : CONTACT_COMPLIANCE_WEIGHTS.OPTIONAL

  const totalScore = Math.round(criticalScore + recommendedScore + optionalScore)

  // Find missing documents for all categories
  const missingCritical = requirements.critical.filter(
    req => !documentTypes.has(req.documentType)
  )
  const missingRecommended = requirements.recommended.filter(
    req => !documentTypes.has(req.documentType)
  )
  const missingOptional = requirements.optional.filter(
    req => !documentTypes.has(req.documentType)
  )

  return {
    score: totalScore,
    critical: {
      completed: criticalCompleted,
      total: requirements.critical.length,
    },
    recommended: {
      completed: recommendedCompleted,
      total: requirements.recommended.length,
    },
    optional: {
      completed: optionalCompleted,
      total: requirements.optional.length,
    },
    missingCritical,
    missingRecommended,
    missingOptional,
  }
}

/**
 * Get required documents for a specific contact role
 */
export function getRequiredDocumentsForRole(role: ContactRole): ContactRoleRequirements {
  return CONTACT_COMPLIANCE_REQUIREMENTS[role]
}
