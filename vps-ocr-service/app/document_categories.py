"""
Document Categories for AI Labeling

Based on Spanish real estate compliance requirements.
These categories MUST match exactly with frontend config (document-categories.ts)
"""

from typing import List, Dict

# Document categories organized by risk level
# VALUES MUST MATCH: apps/web/src/lib/config/document-categories.ts
DOCUMENT_CATEGORIES = {
    # CRITICAL FOR A DEAL (Críticos)
    "critical": [
        "dni_nie_passport",  # DNI/NIE/Passport
        "power_of_attorney",  # Power of Attorney (Poder Notarial)
        "kyc_form",  # KYC Form (Anti-Money Laundering)
        "proof_of_funds",  # Proof of Funds
        "company_deeds",  # Company Deeds (Escritura Constitución)
        "cif",  # CIF (Company ID)
        "administrator_id",  # Administrator ID
        "title_deed",  # Title Deed (Escritura Propiedad)
        "nota_simple",  # Nota Simple (Registry Note)
        "energy_certificate",  # Energy Certificate (CEE)
        "habitability_certificate",  # Habitability Certificate (Cédula)
        "community_debt_certificate",  # Community Debt Certificate
        "ibi_receipt",  # IBI Receipt
        "listing_agreement",  # Listing Agreement (Nota de Encargo)
        "seguro_decenal",  # Seguro Decenal (10-year insurance)
        "building_book",  # Building Book (Libro del Edificio)
    ],
    # LEGALLY RECOMMENDED (Legalmente Recomendados)
    "recommended": [
        "certificate_no_urban_infraction",  # Certificate No Urban Infraction
        "urban_compatibility_certificate",  # Urban Compatibility Certificate
        "urban_planning_certificate",  # Urban Planning Certificate (Cédula Urbanística)
        "arras_contract",  # Arras Contract (Earnest Money)
        "reservation_contract",  # Reservation Contract
        "purchase_contract",  # Purchase Contract (Private)
        "rental_contract",  # Rental Contract (LAU)
        "contrato_compraventa",  # Contrato Compraventa
        "contrato_hipoteca",  # Contrato Hipoteca
        "escritura_hipoteca",  # Escritura Hipoteca
        "technical_building_inspection",  # Technical Building Inspection (ITE)
        "electrical_bulletin",  # Electrical Bulletin (CIE)
        "plusvalia_estimate",  # Plusvalía Estimate
        "modelo_210",  # Modelo 210 (Non-Residents)
        "modelo_600",  # Modelo 600 (Transmisiones)
        "payslips",  # Payslips (Nóminas)
        "tax_returns",  # Tax Returns
        "rent_default_insurance",  # Rent Default Insurance
        "bank_guarantee",  # Bank Guarantee (Aval Bancario)
    ],
    # ADVISED (Aconsejados)
    "advised": [
        "first_occupation_license",  # First Occupation License (LPO)
        "opening_license",  # Opening License (Licencia Apertura)
        "licencia_ocupacion",  # Licencia de Ocupación
        "licencia_obra",  # Licencia de Obra
        "contrato_obra",  # Contrato de Obra
        "community_meeting_minutes",  # Community Meeting Minutes (Actas)
        "community_statutes",  # Community Statutes (Estatutos)
        "recibo_comunidad",  # Recibo Comunidad
        "floor_plans",  # Floor Plans
        "architectural_plans",  # Architectural Plans
        "quality_specifications",  # Quality Specifications (Memoria Calidades)
        "progress_reports",  # Construction Progress Reports
        "informe_tasacion",  # Informe de Tasación
        "acoustic_audit",  # Acoustic/Soundproofing Audit
        "topographic_survey",  # Topographic Survey (Georreferenciación)
        "utility_bills",  # Utility Bills
        "property_inventory",  # Property Inventory
        "water_rights",  # Water Rights Documentation
        "fotos",  # Fotos
    ],
}

# Flat list of all categories for AI to choose from
ALL_CATEGORIES = (
    DOCUMENT_CATEGORIES["critical"]
    + DOCUMENT_CATEGORIES["recommended"]
    + DOCUMENT_CATEGORIES["advised"]
    + ["otro"]  # Otro (Other)
)

# Importance score mapping (1-10 scale)
IMPORTANCE_SCORES = {
    # Critical documents (8-10)
    "dni_nie_passport": 10,
    "power_of_attorney": 9,
    "kyc_form": 9,
    "proof_of_funds": 9,
    "company_deeds": 9,
    "cif": 9,
    "administrator_id": 9,
    "title_deed": 10,
    "nota_simple": 9,
    "energy_certificate": 9,
    "habitability_certificate": 9,
    "community_debt_certificate": 9,
    "ibi_receipt": 8,
    "listing_agreement": 10,
    "seguro_decenal": 8,
    "building_book": 8,
    # Recommended documents (5-7)
    "certificate_no_urban_infraction": 7,
    "urban_compatibility_certificate": 7,
    "urban_planning_certificate": 7,
    "arras_contract": 8,
    "reservation_contract": 7,
    "purchase_contract": 8,
    "rental_contract": 7,
    "contrato_compraventa": 8,
    "contrato_hipoteca": 8,
    "escritura_hipoteca": 8,
    "technical_building_inspection": 7,
    "electrical_bulletin": 6,
    "plusvalia_estimate": 7,
    "modelo_210": 7,
    "modelo_600": 7,
    "payslips": 6,
    "tax_returns": 6,
    "rent_default_insurance": 6,
    "bank_guarantee": 7,
    # Advised documents (2-4)
    "first_occupation_license": 5,
    "opening_license": 5,
    "licencia_ocupacion": 5,
    "licencia_obra": 5,
    "contrato_obra": 6,
    "community_meeting_minutes": 4,
    "community_statutes": 4,
    "recibo_comunidad": 3,
    "floor_plans": 3,
    "architectural_plans": 3,
    "quality_specifications": 4,
    "progress_reports": 3,
    "informe_tasacion": 6,
    "acoustic_audit": 4,
    "topographic_survey": 5,
    "utility_bills": 3,
    "property_inventory": 3,
    "water_rights": 4,
    "fotos": 2,
    "otro": 1,
}

# System prompt for Deepseek AI labeling
SYSTEM_PROMPT = """You are an expert real estate document classifier for the Spanish market.

Your task is to analyze OCR text from real estate documents and extract structured information.

**IMPORTANT: CATEGORY VALUES**
You MUST use these EXACT category values (these are system identifiers, not labels):

CRITICAL DOCUMENTS:
- dni_nie_passport (for DNI, NIE, or Passport documents)
- power_of_attorney (Poder Notarial)
- kyc_form (Anti-Money Laundering form)
- proof_of_funds
- company_deeds (Escritura Constitución)
- cif (Company Tax ID)
- administrator_id
- title_deed (Escritura de Propiedad)
- nota_simple (Property Registry Note)
- energy_certificate (Certificado Energético CEE)
- habitability_certificate (Cédula de Habitabilidad)
- community_debt_certificate
- ibi_receipt (Property Tax Receipt)
- listing_agreement (Nota de Encargo)
- seguro_decenal (10-year insurance for new builds)
- building_book (Libro del Edificio)

RECOMMENDED DOCUMENTS:
- certificate_no_urban_infraction
- urban_compatibility_certificate
- urban_planning_certificate (Cédula Urbanística)
- arras_contract (Earnest Money Contract)
- reservation_contract
- purchase_contract
- rental_contract (LAU)
- contrato_compraventa
- contrato_hipoteca
- escritura_hipoteca
- technical_building_inspection (ITE)
- electrical_bulletin (CIE - Boletín Eléctrico)
- plusvalia_estimate
- modelo_210 (Non-Residents tax form)
- modelo_600 (Transmisiones tax form)
- payslips (Nóminas)
- tax_returns
- rent_default_insurance
- bank_guarantee (Aval Bancario)

ADVISED DOCUMENTS:
- first_occupation_license (LPO)
- opening_license (Licencia Apertura)
- licencia_ocupacion
- licencia_obra
- contrato_obra
- community_meeting_minutes (Actas)
- community_statutes (Estatutos)
- recibo_comunidad
- floor_plans
- architectural_plans
- quality_specifications (Memoria de Calidades)
- progress_reports
- informe_tasacion (Valuation Report)
- acoustic_audit
- topographic_survey (Georreferenciación)
- utility_bills
- property_inventory
- water_rights
- fotos

OTHER:
- otro (for unrecognized documents)

**EXTRACTION RULES:**
1. **category**: Select ONE category value from above (use the exact snake_case identifier, NOT the description)
2. **extracted_names**: Extract ALL person names (clients, notaries, agents) as separate items
3. **extracted_addresses**: Extract ALL property addresses mentioned
4. **extracted_date_of_birth**: For ID documents (dni_nie_passport), extract the person's date of birth in YYYY-MM-DD format
5. **extracted_place_of_birth**: For ID documents (dni_nie_passport), extract the person's place of birth (city/country)
6. **document_date**: Primary document date (issue date, signing date, or most recent date) in YYYY-MM-DD format
7. **due_date**: Expiration or deadline date (if any) in YYYY-MM-DD format
8. **description**: Write a concise 1-2 sentence summary in English
9. **has_signature**: true if you see words like "signed", "signature", "firmado", "firma"
10. **confidence**: Score 0.0-1.0 for each field (use 0.0 for missing/uncertain fields)

**CRITICAL RULES:**
- For category: Use ONLY the exact snake_case values listed above (e.g., "dni_nie_passport" NOT "DNI" or "DNI, NIE, Passport")
- If a DNI, NIE, or Passport is detected, use "dni_nie_passport" (singular value)
- **FOR ID DOCUMENTS (dni_nie_passport): ALWAYS extract date_of_birth and place_of_birth if visible** - these are CRITICAL for matching to contacts
- If a field is not found or you're uncertain, set it to null and confidence to 0.0
- Only null fields will be skipped; other fields will update the database
- Be conservative with confidence scores; use < 0.7 for uncertain data
- Names should be "First Last" format, not reversed
- Addresses should include street, city, and any identifying details
- Dates must be in YYYY-MM-DD format
- Look for these ID-specific fields: "Fecha de nacimiento", "Date of birth", "Lugar de nacimiento", "Place of birth", "Born in"

**RESPONSE FORMAT:**
Return valid JSON only, no explanation:
```json
{
  "category": "dni_nie_passport",
  "extracted_names": ["Name 1", "Name 2"],
  "extracted_addresses": ["Address 1"],
  "extracted_date_of_birth": "1990-05-15",
  "extracted_place_of_birth": "Madrid, Spain",
  "document_date": "YYYY-MM-DD",
  "due_date": "YYYY-MM-DD",
  "description": "Brief summary here",
  "has_signature": true,
  "confidence": {
    "category": 0.95,
    "extracted_date_of_birth": 0.92,
    "extracted_place_of_birth": 0.85,
    "document_date": 0.88,
    "due_date": 0.0,
    "has_signature": 0.90
  }
}
```

**NOTES:**
- For non-ID documents, extracted_date_of_birth and extracted_place_of_birth should be null
- For ID documents (dni_nie_passport), these fields are CRITICAL for contact matching
"""


def get_importance_score(category: str) -> int:
    """Get importance score for a document category (1-10)"""
    return IMPORTANCE_SCORES.get(category, 1)


def get_category_risk_level(category: str) -> str:
    """Get risk level for a document category"""
    if category in DOCUMENT_CATEGORIES["critical"]:
        return "critical"
    elif category in DOCUMENT_CATEGORIES["recommended"]:
        return "recommended"
    elif category in DOCUMENT_CATEGORIES["advised"]:
        return "advised"
    else:
        return "other"
