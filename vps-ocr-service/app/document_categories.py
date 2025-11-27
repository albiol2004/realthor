"""
Document Categories for AI Labeling

Based on Spanish real estate compliance requirements (RISK_CATEGORIES.md)
"""

from typing import List, Dict

# Document categories organized by importance level
DOCUMENT_CATEGORIES = {
    # CRITICAL FOR A DEAL (Críticos)
    "critical": [
        "DNI",  # Spanish National ID
        "NIE",  # Foreign National ID
        "Passport",
        "Power of Attorney",
        "KYC Form",
        "Proof of Funds",
        "Property Title Deed",
        "Nota Simple",  # Property registry note
        "Energy Certificate (CEE)",
        "Community Debt Certificate",
        "Habitability Certificate (Cédula)",
        "IBI Receipt",  # Property tax
        "Sales Listing Agreement (Nota de Encargo)",
        "Seguro Decenal",  # 10-year insurance for new builds
        "Libro del Edificio",  # Building book
    ],
    # LEGALLY RECOMMENDED (Legalmente Recomendados)
    "recommended": [
        "Certificate of No Urban Infraction",
        "Earnest Money Contract (Arras)",
        "Technical Building Inspection (ITE)",
        "Electrical Bulletin (CIE)",
        "Plusvalía Municipal",  # Municipal capital gains tax
        "Payslips",
        "Tax Returns",
        "Rent Default Insurance",
    ],
    # ADVISED (Aconsejados)
    "advised": [
        "Community Meeting Minutes (Actas)",
        "Community Statutes",
        "Floor Plans",
        "Cadastral Plans",
        "Utility Bills",
        "Home Insurance",
        "Defect Photos",
        "Property Photos",
    ],
}

# Flat list of all categories for AI to choose from
ALL_CATEGORIES = (
    DOCUMENT_CATEGORIES["critical"]
    + DOCUMENT_CATEGORIES["recommended"]
    + DOCUMENT_CATEGORIES["advised"]
    + ["Other"]  # Catch-all for unrecognized documents
)

# Importance score mapping (1-10 scale)
IMPORTANCE_SCORES = {
    # Critical documents (8-10)
    "DNI": 10,
    "NIE": 10,
    "Passport": 10,
    "Power of Attorney": 9,
    "KYC Form": 9,
    "Proof of Funds": 9,
    "Property Title Deed": 10,
    "Nota Simple": 9,
    "Energy Certificate (CEE)": 9,
    "Community Debt Certificate": 9,
    "Habitability Certificate (Cédula)": 9,
    "IBI Receipt": 8,
    "Sales Listing Agreement (Nota de Encargo)": 10,
    "Seguro Decenal": 8,
    "Libro del Edificio": 8,
    # Recommended documents (5-7)
    "Certificate of No Urban Infraction": 7,
    "Earnest Money Contract (Arras)": 8,
    "Technical Building Inspection (ITE)": 7,
    "Electrical Bulletin (CIE)": 6,
    "Plusvalía Municipal": 7,
    "Payslips": 6,
    "Tax Returns": 6,
    "Rent Default Insurance": 6,
    # Advised documents (2-4)
    "Community Meeting Minutes (Actas)": 4,
    "Community Statutes": 4,
    "Floor Plans": 3,
    "Cadastral Plans": 3,
    "Utility Bills": 3,
    "Home Insurance": 4,
    "Defect Photos": 2,
    "Property Photos": 2,
    "Other": 1,
}

# System prompt for Deepseek AI labeling
SYSTEM_PROMPT = """You are an expert real estate document classifier for the Spanish market.

Your task is to analyze OCR text from real estate documents and extract structured information.

**DOCUMENT CATEGORIES** (choose the most specific match):
CRITICAL:
- DNI, NIE, Passport, Power of Attorney
- KYC Form, Proof of Funds
- Property Title Deed, Nota Simple
- Energy Certificate (CEE), Community Debt Certificate, Habitability Certificate (Cédula)
- IBI Receipt, Sales Listing Agreement (Nota de Encargo)
- Seguro Decenal, Libro del Edificio

RECOMMENDED:
- Certificate of No Urban Infraction, Earnest Money Contract (Arras)
- Technical Building Inspection (ITE), Electrical Bulletin (CIE)
- Plusvalía Municipal, Payslips, Tax Returns
- Rent Default Insurance

ADVISED:
- Community Meeting Minutes (Actas), Community Statutes
- Floor Plans, Cadastral Plans
- Utility Bills, Home Insurance
- Defect Photos, Property Photos

OTHER: For unrecognized documents

**EXTRACTION RULES:**
1. **category**: Select ONE category from the list above that best matches the document
2. **extracted_names**: Extract ALL person names (clients, notaries, agents) as separate items
3. **extracted_addresses**: Extract ALL property addresses mentioned
4. **document_date**: Primary document date (issue date, signing date, or most recent date)
5. **due_date**: Expiration or deadline date (if any)
6. **description**: Write a concise 1-2 sentence summary in English
7. **has_signature**: true if you see words like "signed", "signature", "firmado", "firma"
8. **confidence**: Score 0.0-1.0 for each field (use 0.0 for missing/uncertain fields)

**IMPORTANT:**
- If a field is not found or you're uncertain, set it to null and confidence to 0.0
- Only null fields will be skipped; other fields will update the database
- Be conservative with confidence scores; use < 0.7 for uncertain data
- Names should be "First Last" format, not reversed
- Addresses should include street, city, and any identifying details

**RESPONSE FORMAT:**
Return valid JSON only, no explanation:
```json
{
  "category": "Document Category Here",
  "extracted_names": ["Name 1", "Name 2"],
  "extracted_addresses": ["Address 1"],
  "document_date": "YYYY-MM-DD",
  "due_date": "YYYY-MM-DD",
  "description": "Brief summary here",
  "has_signature": true,
  "confidence": {
    "category": 0.95,
    "document_date": 0.88,
    "due_date": 0.0,
    "has_signature": 0.90
  }
}
```
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
