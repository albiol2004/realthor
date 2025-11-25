import type { DealType, DocumentType } from '@/types/crm'

/**
 * Deal Compliance Requirements Configuration
 * Based on DEALS_CATEGORIES.md - Spanish real estate transaction requirements
 *
 * Each deal type has specific document requirements in 3 levels:
 * - CRITICAL (40% weight): Deal killers - cannot proceed without these
 * - LEGALLY_RECOMMENDED (35% weight): Safety net - avoid fines and deal failures
 * - ADVISED (25% weight): Due diligence - best practices
 */

export interface DocumentRequirement {
  documentType: DocumentType
  name: string
  description: string
  importance: 'CRITICAL' | 'LEGALLY_RECOMMENDED' | 'ADVISED'
}

export interface DealTypeRequirements {
  dealType: DealType
  label: string
  description: string
  critical: DocumentRequirement[]
  legallyRecommended: DocumentRequirement[]
  advised: DocumentRequirement[]
}

/**
 * Compliance scoring weights
 */
export const COMPLIANCE_WEIGHTS = {
  CRITICAL: 40,              // 40% weight
  LEGALLY_RECOMMENDED: 35,   // 35% weight
  ADVISED: 25,               // 25% weight
} as const

/**
 * Deal type compliance requirements
 * Maps each deal type to its required documents
 */
export const DEAL_COMPLIANCE_REQUIREMENTS: Record<DealType, DealTypeRequirements> = {
  residential_resale: {
    dealType: 'residential_resale',
    label: 'Residential Resale (Second Hand)',
    description: 'Most common transaction. High risk of hidden debts and physical defects.',
    critical: [
      {
        documentType: 'dni_nie_passport',
        name: 'DNI/NIE/Passport',
        description: 'Identification of all owners',
        importance: 'CRITICAL',
      },
      {
        documentType: 'power_of_attorney',
        name: 'Power of Attorney',
        description: 'Original copy mandatory at Notary (if applicable)',
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
        description: 'Buyer must show origin of money',
        importance: 'CRITICAL',
      },
      {
        documentType: 'title_deed',
        name: 'Title Deed (Escritura)',
        description: 'Original deed to verify ownership',
        importance: 'CRITICAL',
      },
      {
        documentType: 'nota_simple',
        name: 'Nota Simple',
        description: 'Must be recent (<3 months). Check for mortgage or embargo.',
        importance: 'CRITICAL',
      },
      {
        documentType: 'energy_certificate',
        name: 'Energy Certificate (CEE)',
        description: 'Mandatory for listing',
        importance: 'CRITICAL',
      },
      {
        documentType: 'community_debt_certificate',
        name: 'Community Debt Certificate',
        description: 'Cannot sign at Notary without this',
        importance: 'CRITICAL',
      },
      {
        documentType: 'habitability_certificate',
        name: 'Habitability Certificate (Cédula)',
        description: 'MANDATORY in Catalonia, Asturias, Cantabria, La Rioja, Navarre, Murcia',
        importance: 'CRITICAL',
      },
      {
        documentType: 'seguro_decenal',
        name: 'Seguro Decenal',
        description: 'Only if property is <10 years old',
        importance: 'CRITICAL',
      },
      {
        documentType: 'ibi_receipt',
        name: 'IBI Receipt',
        description: 'Notary needs cadastral reference and proof of payment',
        importance: 'CRITICAL',
      },
      {
        documentType: 'listing_agreement',
        name: 'Sales Listing Agreement (Nota de Encargo)',
        description: 'Without this, you have no right to sell or claim commission',
        importance: 'CRITICAL',
      },
    ],
    legallyRecommended: [
      {
        documentType: 'certificate_no_urban_infraction',
        name: 'Certificate of No Urban Infraction',
        description: 'Vital for villas/chalets. Prevents fines for illegal builds.',
        importance: 'LEGALLY_RECOMMENDED',
      },
      {
        documentType: 'arras_contract',
        name: 'Arras Contract (Earnest Money)',
        description: 'Essential to secure price and penalize backing out',
        importance: 'LEGALLY_RECOMMENDED',
      },
      {
        documentType: 'technical_building_inspection',
        name: 'ITE (Technical Building Inspection)',
        description: 'Mandatory for buildings >45-50 years. Banks often require.',
        importance: 'LEGALLY_RECOMMENDED',
      },
      {
        documentType: 'electrical_bulletin',
        name: 'Electrical Bulletin (CIE)',
        description: 'Needed if installation is >20 years old',
        importance: 'LEGALLY_RECOMMENDED',
      },
      {
        documentType: 'plusvalia_estimate',
        name: 'Plusvalía Estimate',
        description: 'Seller needs to know this cost',
        importance: 'LEGALLY_RECOMMENDED',
      },
    ],
    advised: [
      {
        documentType: 'community_meeting_minutes',
        name: 'Community Meeting Minutes (Actas)',
        description: 'Last 2 years. Look for "Derramas" (expensive repairs)',
        importance: 'ADVISED',
      },
      {
        documentType: 'floor_plans',
        name: 'Floor Plans',
        description: 'Property layout documentation',
        importance: 'ADVISED',
      },
      {
        documentType: 'utility_bills',
        name: 'Utility Bills',
        description: 'Last 3 months of bills',
        importance: 'ADVISED',
      },
    ],
  },

  new_development: {
    dealType: 'new_development',
    label: 'New Development (Obra Nueva)',
    description: 'Buying from developer. Compliance burden on building legality.',
    critical: [
      {
        documentType: 'dni_nie_passport',
        name: 'DNI/NIE/Passport',
        description: 'Buyer identification',
        importance: 'CRITICAL',
      },
      {
        documentType: 'kyc_form',
        name: 'KYC Form',
        description: 'Strict KYC - developers are audited heavily',
        importance: 'CRITICAL',
      },
      {
        documentType: 'proof_of_funds',
        name: 'Proof of Funds',
        description: 'Origin of money for AML compliance',
        importance: 'CRITICAL',
      },
      {
        documentType: 'reservation_contract',
        name: 'Reservation Contract',
        description: 'Initial contract to reserve unit',
        importance: 'CRITICAL',
      },
      {
        documentType: 'purchase_contract',
        name: 'Purchase Contract (Private)',
        description: 'Main purchase agreement',
        importance: 'CRITICAL',
      },
      {
        documentType: 'first_occupation_license',
        name: 'First Occupation License (LPO)',
        description: 'Replaces Cédula. Cannot legally live without this.',
        importance: 'CRITICAL',
      },
      {
        documentType: 'seguro_decenal',
        name: 'Seguro Decenal',
        description: '10-year structural insurance proof',
        importance: 'CRITICAL',
      },
      {
        documentType: 'building_book',
        name: 'Building Book (Libro del Edificio)',
        description: 'Building "user manual" - blueprints, materials',
        importance: 'CRITICAL',
      },
      {
        documentType: 'bank_guarantee',
        name: 'Bank Guarantee (Aval Bancario)',
        description: 'Guarantees buyer deposit if building not finished',
        importance: 'CRITICAL',
      },
    ],
    legallyRecommended: [
      {
        documentType: 'architectural_plans',
        name: 'Stamped Architectural Plans',
        description: 'Attached to contract',
        importance: 'LEGALLY_RECOMMENDED',
      },
      {
        documentType: 'quality_specifications',
        name: 'Quality Specifications (Memoria de Calidades)',
        description: 'Binding list of materials (flooring, appliances)',
        importance: 'LEGALLY_RECOMMENDED',
      },
    ],
    advised: [
      {
        documentType: 'progress_reports',
        name: 'Construction Progress Reports',
        description: 'Photos/certifications of construction stages',
        importance: 'ADVISED',
      },
    ],
  },

  residential_rental: {
    dealType: 'residential_rental',
    label: 'Residential Rentals (Alquiler LAU)',
    description: 'Compliance focuses on tenant solvency and property habitability.',
    critical: [
      {
        documentType: 'dni_nie_passport',
        name: 'DNI/NIE/Passport',
        description: 'Tenant identification',
        importance: 'CRITICAL',
      },
      {
        documentType: 'listing_agreement',
        name: 'Listing Agreement',
        description: 'Authorizing agent to rent property',
        importance: 'CRITICAL',
      },
      {
        documentType: 'energy_certificate',
        name: 'Energy Certificate (CEE)',
        description: 'Legally required copy to tenant',
        importance: 'CRITICAL',
      },
      {
        documentType: 'habitability_certificate',
        name: 'Habitability Certificate (Cédula)',
        description: 'Proves legal dwelling (vital for Empadronamiento)',
        importance: 'CRITICAL',
      },
      {
        documentType: 'rental_contract',
        name: 'Rental Contract (LAU)',
        description: 'Must adhere to Ley de Arrendamientos Urbanos',
        importance: 'CRITICAL',
      },
    ],
    legallyRecommended: [
      {
        documentType: 'payslips',
        name: 'Payslips (Nóminas)',
        description: 'Tenant solvency proof',
        importance: 'LEGALLY_RECOMMENDED',
      },
      {
        documentType: 'tax_returns',
        name: 'Tax Returns',
        description: 'Alternative solvency proof',
        importance: 'LEGALLY_RECOMMENDED',
      },
      {
        documentType: 'rent_default_insurance',
        name: 'Rent Default Insurance (Seguro de Impago)',
        description: 'Highly recommended - second risk filter',
        importance: 'LEGALLY_RECOMMENDED',
      },
      {
        documentType: 'property_inventory',
        name: 'Property Inventory',
        description: 'Photo-documented annex to protect deposit',
        importance: 'LEGALLY_RECOMMENDED',
      },
    ],
    advised: [
      {
        documentType: 'utility_bills',
        name: 'Utility Bills',
        description: 'Show tenant expected costs',
        importance: 'ADVISED',
      },
      {
        documentType: 'community_statutes',
        name: 'Community Statutes',
        description: 'Check if pets or specific activities banned',
        importance: 'ADVISED',
      },
    ],
  },

  commercial: {
    dealType: 'commercial',
    label: 'Commercial & Retail (Locales & Traspasos)',
    description: 'Business-to-Business. Focus on activity licenses.',
    critical: [
      {
        documentType: 'company_deeds',
        name: 'Company Deeds (Escritura de Constitución)',
        description: 'Company incorporation documents',
        importance: 'CRITICAL',
      },
      {
        documentType: 'cif',
        name: 'CIF (Company ID)',
        description: 'Company tax identification',
        importance: 'CRITICAL',
      },
      {
        documentType: 'administrator_id',
        name: 'Administrator ID',
        description: 'Legal representative identification',
        importance: 'CRITICAL',
      },
      {
        documentType: 'title_deed',
        name: 'Title Deed',
        description: 'Property ownership proof',
        importance: 'CRITICAL',
      },
      {
        documentType: 'nota_simple',
        name: 'Nota Simple',
        description: 'Property registry status',
        importance: 'CRITICAL',
      },
      {
        documentType: 'community_debt_certificate',
        name: 'Community Certificate',
        description: 'Commercial units often have high fees',
        importance: 'CRITICAL',
      },
      {
        documentType: 'energy_certificate',
        name: 'Energy Certificate (CEE)',
        description: 'Required for sale/rent of offices/shops',
        importance: 'CRITICAL',
      },
      {
        documentType: 'ibi_receipt',
        name: 'IBI Receipt',
        description: 'Property tax proof',
        importance: 'CRITICAL',
      },
      {
        documentType: 'listing_agreement',
        name: 'Listing Agreement',
        description: 'Agent authorization',
        importance: 'CRITICAL',
      },
    ],
    legallyRecommended: [
      {
        documentType: 'urban_compatibility_certificate',
        name: 'Urban Compatibility Certificate',
        description: 'Ensure Town Hall allows business activity at address',
        importance: 'LEGALLY_RECOMMENDED',
      },
      {
        documentType: 'opening_license',
        name: 'Opening License (Licencia de Apertura)',
        description: 'Must be valid and transferable for Traspaso',
        importance: 'LEGALLY_RECOMMENDED',
      },
      {
        documentType: 'electrical_bulletin',
        name: 'Electrical Bulletin (CIE)',
        description: 'Commercial power needs are higher',
        importance: 'LEGALLY_RECOMMENDED',
      },
    ],
    advised: [
      {
        documentType: 'acoustic_audit',
        name: 'Acoustic/Soundproofing Audit',
        description: 'For bars/restaurants',
        importance: 'ADVISED',
      },
    ],
  },

  rural_land: {
    dealType: 'rural_land',
    label: 'Rural & Land (Rustica / Terrenos)',
    description: 'The Wild West. Biggest risk is boundary disputes and illegal builds.',
    critical: [
      {
        documentType: 'title_deed',
        name: 'Title Deed',
        description: 'WARNING: Often does not match reality in rural Spain',
        importance: 'CRITICAL',
      },
      {
        documentType: 'nota_simple',
        name: 'Nota Simple',
        description: 'Property registry check',
        importance: 'CRITICAL',
      },
      {
        documentType: 'dni_nie_passport',
        name: 'DNI/NIE/Passport',
        description: 'Owner identification',
        importance: 'CRITICAL',
      },
      {
        documentType: 'listing_agreement',
        name: 'Listing Agreement',
        description: 'Agent authorization',
        importance: 'CRITICAL',
      },
      {
        documentType: 'ibi_receipt',
        name: 'IBI Receipt',
        description: 'Polígono/Parcela numbers must match',
        importance: 'CRITICAL',
      },
    ],
    legallyRecommended: [
      {
        documentType: 'urban_planning_certificate',
        name: 'Urban Planning Certificate (Cédula Urbanística)',
        description: 'States exactly what can/cannot be built',
        importance: 'LEGALLY_RECOMMENDED',
      },
      {
        documentType: 'topographic_survey',
        name: 'Topographic Survey (Georreferenciación)',
        description: 'VITAL. Cadastre map often wrong. GPS coordinates of borders.',
        importance: 'LEGALLY_RECOMMENDED',
      },
      {
        documentType: 'certificate_no_urban_infraction',
        name: 'Certificate of No Infraction',
        description: 'Essential if small house/shed on land',
        importance: 'LEGALLY_RECOMMENDED',
      },
    ],
    advised: [
      {
        documentType: 'water_rights',
        name: 'Water Rights Documentation',
        description: 'Ownership of wells or irrigation rights (crucial for value)',
        importance: 'ADVISED',
      },
    ],
  },
}

/**
 * Calculate compliance score for a deal based on its documents
 * Returns a score from 0-100
 */
export function calculateDealCompliance(
  dealType: DealType,
  documents: Array<{ documentType?: DocumentType }>
): {
  score: number
  critical: { completed: number; total: number }
  legallyRecommended: { completed: number; total: number }
  advised: { completed: number; total: number }
  missingCritical: DocumentRequirement[]
} {
  const requirements = DEAL_COMPLIANCE_REQUIREMENTS[dealType]
  const documentTypes = new Set(documents.map(d => d.documentType).filter(Boolean))

  // Count completed requirements by category
  const criticalCompleted = requirements.critical.filter(
    req => documentTypes.has(req.documentType)
  ).length
  const legallyRecommendedCompleted = requirements.legallyRecommended.filter(
    req => documentTypes.has(req.documentType)
  ).length
  const advisedCompleted = requirements.advised.filter(
    req => documentTypes.has(req.documentType)
  ).length

  // Calculate weighted score
  const criticalScore = requirements.critical.length > 0
    ? (criticalCompleted / requirements.critical.length) * COMPLIANCE_WEIGHTS.CRITICAL
    : 0
  const legallyRecommendedScore = requirements.legallyRecommended.length > 0
    ? (legallyRecommendedCompleted / requirements.legallyRecommended.length) * COMPLIANCE_WEIGHTS.LEGALLY_RECOMMENDED
    : 0
  const advisedScore = requirements.advised.length > 0
    ? (advisedCompleted / requirements.advised.length) * COMPLIANCE_WEIGHTS.ADVISED
    : 0

  const totalScore = Math.round(criticalScore + legallyRecommendedScore + advisedScore)

  // Find missing critical documents
  const missingCritical = requirements.critical.filter(
    req => !documentTypes.has(req.documentType)
  )

  return {
    score: totalScore,
    critical: {
      completed: criticalCompleted,
      total: requirements.critical.length,
    },
    legallyRecommended: {
      completed: legallyRecommendedCompleted,
      total: requirements.legallyRecommended.length,
    },
    advised: {
      completed: advisedCompleted,
      total: requirements.advised.length,
    },
    missingCritical,
  }
}

/**
 * Get required documents for a specific deal type
 */
export function getRequiredDocuments(dealType: DealType): DealTypeRequirements {
  return DEAL_COMPLIANCE_REQUIREMENTS[dealType]
}

/**
 * Check if a deal has all critical documents
 */
export function hasAllCriticalDocuments(
  dealType: DealType,
  documents: Array<{ documentType?: DocumentType }>
): boolean {
  const { critical } = calculateDealCompliance(dealType, documents)
  return critical.completed === critical.total
}
