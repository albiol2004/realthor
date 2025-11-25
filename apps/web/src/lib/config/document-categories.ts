/**
 * Document Categories for Compliance
 * These categories match the risk assessment document types
 */

export const DOCUMENT_TYPES_BY_CATEGORY = {
  "Identificación y KYC": [
    { value: "dni_nie_passport", label: "DNI/NIE/Passport" },
    { value: "power_of_attorney", label: "Power of Attorney (Poder Notarial)" },
    { value: "kyc_form", label: "KYC Form (Anti-Money Laundering)" },
    { value: "proof_of_funds", label: "Proof of Funds" },
    { value: "company_deeds", label: "Company Deeds (Escritura Constitución)" },
    { value: "cif", label: "CIF (Company ID)" },
    { value: "administrator_id", label: "Administrator ID" },
    { value: "payslips", label: "Payslips (Nóminas)" },
    { value: "tax_returns", label: "Tax Returns" },
  ],
  "Contratos": [
    { value: "listing_agreement", label: "Listing Agreement (Nota de Encargo)" },
    { value: "arras_contract", label: "Arras Contract (Earnest Money)" },
    { value: "reservation_contract", label: "Reservation Contract" },
    { value: "purchase_contract", label: "Purchase Contract (Private)" },
    { value: "rental_contract", label: "Rental Contract (LAU)" },
    { value: "contrato_compraventa", label: "Contrato Compraventa" },
    { value: "contrato_obra", label: "Contrato de Obra" },
    { value: "contrato_hipoteca", label: "Contrato Hipoteca" },
  ],
  "Escrituras y Registro": [
    { value: "title_deed", label: "Title Deed (Escritura Propiedad)" },
    { value: "nota_simple", label: "Nota Simple (Registry Note)" },
    { value: "escritura_hipoteca", label: "Escritura Hipoteca" },
  ],
  "Certificados de Propiedad": [
    { value: "energy_certificate", label: "Energy Certificate (CEE)" },
    { value: "habitability_certificate", label: "Habitability Certificate (Cédula)" },
    { value: "community_debt_certificate", label: "Community Debt Certificate" },
    { value: "certificate_no_urban_infraction", label: "Certificate No Urban Infraction" },
    { value: "urban_compatibility_certificate", label: "Urban Compatibility Certificate" },
    { value: "urban_planning_certificate", label: "Urban Planning Certificate (Cédula Urbanística)" },
  ],
  "Licencias": [
    { value: "first_occupation_license", label: "First Occupation License (LPO)" },
    { value: "opening_license", label: "Opening License (Licencia Apertura)" },
    { value: "licencia_ocupacion", label: "Licencia de Ocupación" },
    { value: "licencia_obra", label: "Licencia de Obra" },
  ],
  "Seguros y Garantías": [
    { value: "seguro_decenal", label: "Seguro Decenal (10-year insurance)" },
    { value: "bank_guarantee", label: "Bank Guarantee (Aval Bancario)" },
    { value: "rent_default_insurance", label: "Rent Default Insurance" },
  ],
  "Fiscales": [
    { value: "ibi_receipt", label: "IBI Receipt" },
    { value: "plusvalia_estimate", label: "Plusvalía Estimate" },
    { value: "modelo_210", label: "Modelo 210 (Non-Residents)" },
    { value: "modelo_600", label: "Modelo 600 (Transmisiones)" },
  ],
  "Inspecciones y Técnicos": [
    { value: "technical_building_inspection", label: "Technical Building Inspection (ITE)" },
    { value: "electrical_bulletin", label: "Electrical Bulletin (CIE)" },
    { value: "building_book", label: "Building Book (Libro del Edificio)" },
    { value: "topographic_survey", label: "Topographic Survey (Georreferenciación)" },
    { value: "informe_tasacion", label: "Informe de Tasación" },
    { value: "acoustic_audit", label: "Acoustic/Soundproofing Audit" },
  ],
  "Comunidad": [
    { value: "community_meeting_minutes", label: "Community Meeting Minutes (Actas)" },
    { value: "community_statutes", label: "Community Statutes (Estatutos)" },
    { value: "recibo_comunidad", label: "Recibo Comunidad" },
  ],
  "Planos y Documentación Técnica": [
    { value: "floor_plans", label: "Floor Plans" },
    { value: "architectural_plans", label: "Architectural Plans" },
    { value: "quality_specifications", label: "Quality Specifications (Memoria Calidades)" },
    { value: "progress_reports", label: "Construction Progress Reports" },
  ],
  "Servicios y Otros": [
    { value: "utility_bills", label: "Utility Bills" },
    { value: "property_inventory", label: "Property Inventory" },
    { value: "water_rights", label: "Water Rights Documentation" },
    { value: "fotos", label: "Fotos" },
    { value: "otro", label: "Otro" },
  ],
} as const
