"""
Contact Import Worker

Handles CSV/Excel parsing, AI column mapping, duplicate detection,
and contact creation/update for the contact import system.
"""

import csv
import io
import json
import re
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from loguru import logger

from app.config import settings
from app.database import Database


@dataclass
class ImportRow:
    """Parsed and analyzed import row"""
    row_number: int
    raw_data: Dict[str, str]
    mapped_data: Optional[Dict[str, Any]]
    status: str  # 'new' | 'duplicate' | 'conflict'
    matched_contact_id: Optional[str]
    match_confidence: Optional[float]
    conflicts: Optional[List[Dict[str, Any]]]


class ContactImportWorker:
    """
    Contact Import Worker

    Processes CSV files for contact import:
    1. Parse CSV and extract headers + rows
    2. Use AI to map CSV columns to contact fields
    3. Detect duplicates by matching against existing contacts
    4. Create or update contacts based on mode and decisions
    """

    # Contact fields that can be imported
    CONTACT_FIELDS = {
        "first_name": ["first name", "nombre", "first", "given name", "nombre de pila"],
        "last_name": ["last name", "apellido", "apellidos", "surname", "family name", "last"],
        "email": ["email", "correo", "e-mail", "correo electronico", "mail"],
        "phone": ["phone", "telefono", "tel", "mobile", "movil", "celular", "telephone"],
        "company": ["company", "empresa", "organization", "organizacion", "compania", "business"],
        "job_title": ["job title", "titulo", "position", "cargo", "puesto", "profession"],
        "address_street": ["street", "calle", "direccion", "address", "domicilio"],
        "address_city": ["city", "ciudad", "localidad", "town"],
        "address_state": ["state", "provincia", "estado", "region", "comunidad"],
        "address_zip": ["zip", "codigo postal", "postal code", "cp", "zipcode", "postal"],
        "address_country": ["country", "pais", "nation"],
        "source": ["source", "fuente", "origen", "how did you hear", "referral"],
        "notes": ["notes", "notas", "comments", "comentarios", "observations", "observaciones"],
        "budget_min": ["budget min", "presupuesto minimo", "min budget", "minimum budget"],
        "budget_max": ["budget max", "presupuesto maximo", "max budget", "maximum budget"],
        "date_of_birth": ["date of birth", "fecha de nacimiento", "birthday", "dob", "birth date", "nacimiento"],
        "place_of_birth": ["place of birth", "lugar de nacimiento", "birthplace"],
        "tags": ["tags", "etiquetas", "labels", "categories"],
        "role": ["role", "rol", "client type", "tipo de cliente", "contact type", "tipo de contacto", "relationship", "relacion"],
        "category": ["category", "categoria", "client category", "categoria de cliente", "stage", "etapa"],
    }

    # Valid role values for the database constraint
    VALID_ROLES = ["buyer", "seller", "lender", "tenant", "landlord", "other"]

    # Valid category values for the database constraint
    VALID_CATEGORIES = [
        "potential_buyer", "potential_seller", "signed_buyer", "signed_seller",
        "potential_lender", "potential_tenant"
    ]

    def __init__(self):
        self.deepseek_api_key = settings.deepseek_api_key
        self.deepseek_api_url = "https://api.deepseek.com/v1/chat/completions"

    async def parse_csv(self, file_content: bytes, file_name: str) -> Tuple[List[str], List[Dict[str, str]]]:
        """
        Parse CSV file and extract headers and rows

        Returns:
            Tuple of (headers, rows) where rows is a list of dicts
        """
        try:
            # Try to detect encoding
            content_str = None
            for encoding in ['utf-8', 'utf-8-sig', 'latin-1', 'cp1252']:
                try:
                    content_str = file_content.decode(encoding)
                    break
                except UnicodeDecodeError:
                    continue

            if content_str is None:
                raise ValueError("Could not decode CSV file with supported encodings")

            # Detect delimiter
            sample = content_str[:2000]
            delimiter = self._detect_delimiter(sample)

            # Parse CSV
            reader = csv.DictReader(io.StringIO(content_str), delimiter=delimiter)
            headers = reader.fieldnames or []

            rows = []
            for i, row in enumerate(reader, start=1):
                # Clean up values
                cleaned_row = {k: (v.strip() if v else "") for k, v in row.items() if k}
                # Skip completely empty rows
                if any(v for v in cleaned_row.values()):
                    rows.append(cleaned_row)

            logger.info(f"Parsed CSV: {len(headers)} columns, {len(rows)} rows")
            return headers, rows

        except Exception as e:
            logger.error(f"Failed to parse CSV: {e}")
            raise

    def _detect_delimiter(self, sample: str) -> str:
        """Detect CSV delimiter from sample"""
        delimiters = [',', ';', '\t', '|']
        counts = {d: sample.count(d) for d in delimiters}
        return max(counts, key=counts.get)

    async def map_columns_with_ai(
        self,
        headers: List[str],
        sample_rows: List[Dict[str, str]]
    ) -> Dict[str, str]:
        """
        Use AI to map CSV columns to contact fields

        Returns:
            Dict mapping CSV column names to contact field names
        """
        # First try simple heuristic matching
        mapping = self._heuristic_column_mapping(headers)

        # If AI is available and we have unmapped columns, use AI
        unmapped = [h for h in headers if h not in mapping]
        if unmapped and self.deepseek_api_key:
            ai_mapping = await self._ai_column_mapping(headers, sample_rows, mapping)
            mapping.update(ai_mapping)

        logger.info(f"Column mapping result: {mapping}")
        return mapping

    def _heuristic_column_mapping(self, headers: List[str]) -> Dict[str, str]:
        """Simple heuristic matching based on column name similarity"""
        mapping = {}

        for header in headers:
            header_lower = header.lower().strip()

            for field, keywords in self.CONTACT_FIELDS.items():
                # Check for exact or partial match
                for keyword in keywords:
                    if keyword in header_lower or header_lower in keyword:
                        if field not in mapping.values():  # Don't map same field twice
                            mapping[header] = field
                            break
                if header in mapping:
                    break

        return mapping

    async def _ai_column_mapping(
        self,
        headers: List[str],
        sample_rows: List[Dict[str, str]],
        existing_mapping: Dict[str, str]
    ) -> Dict[str, str]:
        """Use Deepseek AI to map remaining columns"""
        try:
            import aiohttp

            # Build prompt
            sample_data = "\n".join([
                ", ".join([f"{k}: {v}" for k, v in row.items()])
                for row in sample_rows[:3]
            ])

            already_mapped = list(existing_mapping.values())
            available_fields = [f for f in self.CONTACT_FIELDS.keys() if f not in already_mapped]

            prompt = f"""
Analyze these CSV columns and map them to contact fields.

CSV Headers: {headers}

Sample data:
{sample_data}

Already mapped:
{json.dumps(existing_mapping, indent=2)}

Available fields to map: {available_fields}

Return ONLY a JSON object mapping unmapped CSV column names to contact field names.
Only map columns you are confident about. Skip columns that don't match any field.
Example: {{"Telefono Movil": "phone", "Direccion": "address_street"}}
"""

            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.deepseek_api_url,
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {self.deepseek_api_key}"
                    },
                    json={
                        "model": "deepseek-chat",
                        "messages": [
                            {"role": "system", "content": "You are a data mapping assistant. Return only valid JSON."},
                            {"role": "user", "content": prompt}
                        ],
                        "temperature": 0.1,
                        "max_tokens": 500,
                        "response_format": {"type": "json_object"}
                    }
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        content = data["choices"][0]["message"]["content"]
                        return json.loads(content)
                    else:
                        logger.error(f"AI mapping failed: {response.status}")
                        return {}

        except Exception as e:
            logger.error(f"AI column mapping failed: {e}")
            return {}

    async def deduce_roles_with_ai(
        self,
        contacts_data: List[Dict[str, Any]],
        raw_rows: List[Dict[str, str]]
    ) -> List[Dict[str, Any]]:
        """
        Use AI to deduce roles for contacts that don't have one assigned.

        Analyzes contact data including budget, job title, notes, source,
        and raw CSV data to intelligently assign roles.

        Returns the contacts_data list with roles filled in where possible.
        """
        if not self.deepseek_api_key:
            logger.warning("No Deepseek API key - using heuristic role deduction only")
            return [self._heuristic_role_deduction(c, r) for c, r in zip(contacts_data, raw_rows)]

        # Separate contacts that need role deduction
        contacts_needing_roles = []
        indices_needing_roles = []

        for i, contact in enumerate(contacts_data):
            if not contact.get("role") or contact.get("role") not in self.VALID_ROLES:
                contacts_needing_roles.append((contact, raw_rows[i] if i < len(raw_rows) else {}))
                indices_needing_roles.append(i)

        if not contacts_needing_roles:
            logger.info("All contacts already have valid roles assigned")
            return contacts_data

        logger.info(f"Deducing roles for {len(contacts_needing_roles)} contacts using AI")

        # Process in batches to avoid token limits
        batch_size = 20
        for batch_start in range(0, len(contacts_needing_roles), batch_size):
            batch_end = min(batch_start + batch_size, len(contacts_needing_roles))
            batch = contacts_needing_roles[batch_start:batch_end]
            batch_indices = indices_needing_roles[batch_start:batch_end]

            try:
                roles = await self._ai_role_deduction_batch(batch)

                # Apply deduced roles
                for idx, role in zip(batch_indices, roles):
                    if role and role in self.VALID_ROLES:
                        contacts_data[idx]["role"] = role
                        logger.debug(f"Contact {idx}: AI deduced role '{role}'")
                    else:
                        # Fallback to heuristic
                        raw_row = raw_rows[idx] if idx < len(raw_rows) else {}
                        contacts_data[idx] = self._heuristic_role_deduction(contacts_data[idx], raw_row)

            except Exception as e:
                logger.error(f"AI role deduction failed for batch: {e}")
                # Fallback to heuristic for this batch
                for idx in batch_indices:
                    raw_row = raw_rows[idx] if idx < len(raw_rows) else {}
                    contacts_data[idx] = self._heuristic_role_deduction(contacts_data[idx], raw_row)

        return contacts_data

    async def _ai_role_deduction_batch(
        self,
        contacts_with_raw: List[Tuple[Dict[str, Any], Dict[str, str]]]
    ) -> List[Optional[str]]:
        """
        Use Deepseek AI to deduce roles for a batch of contacts.

        Returns list of role strings (or None if couldn't determine).
        """
        import aiohttp

        # Build contact summaries for the prompt
        contact_summaries = []
        for i, (contact, raw_row) in enumerate(contacts_with_raw):
            summary = {
                "index": i,
                "name": f"{contact.get('first_name', '')} {contact.get('last_name', '')}".strip(),
                "job_title": contact.get("job_title"),
                "company": contact.get("company"),
                "budget_min": contact.get("budget_min"),
                "budget_max": contact.get("budget_max"),
                "notes": contact.get("notes", "")[:200] if contact.get("notes") else None,  # Truncate long notes
                "source": contact.get("source"),
                "category": contact.get("category"),
                "tags": contact.get("tags"),
                "address_city": contact.get("address_city"),
                # Include any unmapped raw fields that might provide context
                "raw_extra": {k: v for k, v in raw_row.items() if v and len(v) < 100}
            }
            # Remove None values for cleaner prompt
            summary = {k: v for k, v in summary.items() if v is not None}
            contact_summaries.append(summary)

        prompt = f"""You are a real estate CRM assistant. Analyze these contacts and determine the most appropriate role for each.

VALID ROLES (you MUST use exactly one of these):
- "buyer" - Person looking to purchase property (has budget, looking for homes, interested in buying)
- "seller" - Person looking to sell their property (owns property, wants to list, selling home)
- "lender" - Financial professional (mortgage broker, bank officer, loan officer, financial advisor)
- "tenant" - Person looking to rent property (renter, looking for lease, apartment hunter)
- "landlord" - Person who owns rental property (property owner renting out, investor with rentals)
- "other" - None of the above clearly applies (other professionals, unclear intent)

DECISION RULES:
1. If budget_min or budget_max is present → likely "buyer" or "tenant" (use context to distinguish)
2. If category contains "buyer" → "buyer"
3. If category contains "seller" → "seller"
4. If category contains "lender" → "lender"
5. If category contains "tenant" → "tenant"
6. If job_title suggests real estate/mortgage/banking → "lender" or "other"
7. If notes mention buying, purchasing, looking for home → "buyer"
8. If notes mention selling, listing, own property → "seller"
9. If notes mention renting, lease, apartment → "tenant"
10. If notes mention rental income, investment property, tenants → "landlord"
11. When in doubt between buyer/tenant: higher budgets (>$200k) suggest "buyer", lower suggest "tenant"
12. If truly unclear, use "other"

CONTACTS TO ANALYZE:
{json.dumps(contact_summaries, indent=2)}

Return a JSON object with a "roles" array containing the role for each contact IN ORDER.
Example: {{"roles": ["buyer", "seller", "tenant", "other", "lender"]}}

Return ONLY the JSON object, no explanations."""

        async with aiohttp.ClientSession() as session:
            async with session.post(
                self.deepseek_api_url,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.deepseek_api_key}"
                },
                json={
                    "model": "deepseek-chat",
                    "messages": [
                        {"role": "system", "content": "You are a real estate CRM assistant that analyzes contact data to determine client roles. Return only valid JSON."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.1,
                    "max_tokens": 1000,
                    "response_format": {"type": "json_object"}
                }
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    content = data["choices"][0]["message"]["content"]
                    result = json.loads(content)
                    roles = result.get("roles", [])
                    logger.info(f"AI deduced roles: {roles}")
                    return roles
                else:
                    error_text = await response.text()
                    logger.error(f"AI role deduction failed: {response.status} - {error_text}")
                    return [None] * len(contacts_with_raw)

    def _heuristic_role_deduction(
        self,
        contact: Dict[str, Any],
        raw_row: Dict[str, str]
    ) -> Dict[str, Any]:
        """
        Fallback heuristic-based role deduction when AI is unavailable.

        Uses simple rules based on available data to assign a role.
        """
        # If role already valid, return as-is
        if contact.get("role") in self.VALID_ROLES:
            return contact

        role = None

        # Check category first (most reliable signal)
        category = contact.get("category", "").lower() if contact.get("category") else ""
        if "buyer" in category:
            role = "buyer"
        elif "seller" in category:
            role = "seller"
        elif "lender" in category:
            role = "lender"
        elif "tenant" in category:
            role = "tenant"

        # Check budget (strong signal for buyer/tenant)
        if not role:
            budget_min = contact.get("budget_min")
            budget_max = contact.get("budget_max")
            if budget_min or budget_max:
                # Higher budgets suggest buyer, lower suggest tenant
                max_budget = budget_max or budget_min or 0
                if isinstance(max_budget, str):
                    try:
                        max_budget = float(re.sub(r'[^\d.]', '', max_budget))
                    except:
                        max_budget = 0

                if max_budget >= 100000:  # $100k+ likely buyer
                    role = "buyer"
                else:
                    role = "tenant"

        # Check job title for lender signals
        if not role:
            job_title = (contact.get("job_title") or "").lower()
            lender_keywords = ["mortgage", "loan", "bank", "lending", "finance", "broker", "credit"]
            if any(kw in job_title for kw in lender_keywords):
                role = "lender"

        # Check notes for signals
        if not role:
            notes = (contact.get("notes") or "").lower()
            raw_values = " ".join(str(v).lower() for v in raw_row.values() if v)
            combined_text = f"{notes} {raw_values}"

            # Buyer signals
            if any(kw in combined_text for kw in ["buying", "purchase", "looking for home", "house hunting", "comprar", "busca casa"]):
                role = "buyer"
            # Seller signals
            elif any(kw in combined_text for kw in ["selling", "list my", "own property", "vender", "mi casa"]):
                role = "seller"
            # Tenant signals
            elif any(kw in combined_text for kw in ["renting", "lease", "apartment", "alquiler", "piso"]):
                role = "tenant"
            # Landlord signals
            elif any(kw in combined_text for kw in ["rental property", "investment", "tenant", "inquilino", "alquilar mi"]):
                role = "landlord"

        # Default to "other" if we couldn't determine
        if not role:
            role = "other"

        contact["role"] = role
        logger.debug(f"Heuristic deduced role '{role}' for {contact.get('first_name')} {contact.get('last_name')}")

        return contact

    def _validate_and_normalize_role(self, role_value: str) -> Optional[str]:
        """
        Validate and normalize a role value from CSV.

        Handles common variations and returns a valid role or None.
        """
        if not role_value:
            return None

        role_lower = role_value.lower().strip()

        # Direct match
        if role_lower in self.VALID_ROLES:
            return role_lower

        # Common variations mapping
        role_mappings = {
            # Buyer variations
            "comprador": "buyer", "cliente comprador": "buyer", "purchaser": "buyer",
            "home buyer": "buyer", "property buyer": "buyer", "buying": "buyer",
            # Seller variations
            "vendedor": "seller", "cliente vendedor": "seller", "home seller": "seller",
            "property seller": "seller", "selling": "seller", "owner": "seller",
            # Lender variations
            "prestamista": "lender", "mortgage": "lender", "bank": "lender",
            "financiero": "lender", "loan officer": "lender", "mortgage broker": "lender",
            # Tenant variations
            "inquilino": "tenant", "arrendatario": "tenant", "renter": "tenant",
            "lessee": "tenant", "rentee": "tenant",
            # Landlord variations
            "propietario": "landlord", "arrendador": "landlord", "property owner": "landlord",
            "lessor": "landlord", "rental owner": "landlord",
            # Other variations
            "otro": "other", "otros": "other", "unknown": "other", "n/a": "other",
        }

        if role_lower in role_mappings:
            return role_mappings[role_lower]

        # Partial match - check if any valid role is contained
        for valid_role in self.VALID_ROLES:
            if valid_role in role_lower:
                return valid_role

        return None

    def _validate_and_normalize_category(self, category_value: str) -> Optional[str]:
        """
        Validate and normalize a category value from CSV.
        """
        if not category_value:
            return None

        cat_lower = category_value.lower().strip().replace(" ", "_").replace("-", "_")

        # Direct match
        if cat_lower in self.VALID_CATEGORIES:
            return cat_lower

        # Common variations
        category_mappings = {
            "potential buyer": "potential_buyer", "potencial comprador": "potential_buyer",
            "potential seller": "potential_seller", "potencial vendedor": "potential_seller",
            "signed buyer": "signed_buyer", "comprador firmado": "signed_buyer",
            "signed seller": "signed_seller", "vendedor firmado": "signed_seller",
            "potential lender": "potential_lender", "potencial prestamista": "potential_lender",
            "potential tenant": "potential_tenant", "potencial inquilino": "potential_tenant",
        }

        if cat_lower in category_mappings:
            return category_mappings[cat_lower]

        # Partial match
        for valid_cat in self.VALID_CATEGORIES:
            if valid_cat.replace("_", "") in cat_lower.replace("_", ""):
                return valid_cat

        return None

    async def analyze_rows(
        self,
        rows: List[Dict[str, str]],
        column_mapping: Dict[str, str],
        user_id: str
    ) -> List[ImportRow]:
        """
        Analyze rows for duplicates and conflicts

        Returns list of ImportRow with analysis results
        """
        # Get existing contacts for matching
        existing_contacts = await Database.get_user_contacts_for_matching(user_id)
        logger.info(f"Loaded {len(existing_contacts)} existing contacts for matching")

        # Build lookup indexes for fast matching
        email_index = {c["email"].lower(): c for c in existing_contacts if c.get("email")}
        phone_index = {self._normalize_phone(c["phone"]): c for c in existing_contacts if c.get("phone")}
        name_index = {}
        for c in existing_contacts:
            key = f"{c['first_name']} {c['last_name']}".lower().strip()
            if key:
                name_index[key] = c

        # Phase 1: Map all rows first
        mapped_rows = []  # List of (row_number, raw_row, mapped_data)
        for i, raw_row in enumerate(rows, start=1):
            # Apply column mapping
            mapped_data = self._apply_mapping(raw_row, column_mapping)

            # Skip rows without required fields
            if not mapped_data.get("first_name") or not mapped_data.get("last_name"):
                logger.debug(f"Row {i}: Skipping - missing first_name or last_name")
                continue

            mapped_rows.append((i, raw_row, mapped_data))

        # Phase 2: Deduce roles for contacts that don't have one
        if mapped_rows:
            contacts_data = [m[2] for m in mapped_rows]
            raw_rows_for_deduction = [m[1] for m in mapped_rows]

            logger.info(f"Starting role deduction for {len(contacts_data)} contacts")
            contacts_with_roles = await self.deduce_roles_with_ai(contacts_data, raw_rows_for_deduction)

            # Update mapped_rows with deduced roles
            mapped_rows = [
                (row_num, raw_row, contacts_with_roles[i])
                for i, (row_num, raw_row, _) in enumerate(mapped_rows)
            ]

            # Log role distribution
            role_counts = {}
            for _, _, contact in mapped_rows:
                role = contact.get("role", "none")
                role_counts[role] = role_counts.get(role, 0) + 1
            logger.info(f"Role distribution after deduction: {role_counts}")

        # Phase 3: Analyze for duplicates and conflicts
        analyzed_rows = []
        for row_number, raw_row, mapped_data in mapped_rows:
            # Find matching contact
            match, confidence, match_type = self._find_matching_contact(
                mapped_data, email_index, phone_index, name_index
            )

            if match:
                # Determine if duplicate or conflict
                conflicts = self._detect_conflicts(mapped_data, match)

                if conflicts:
                    status = "conflict"
                else:
                    status = "duplicate"

                analyzed_rows.append(ImportRow(
                    row_number=row_number,
                    raw_data=raw_row,
                    mapped_data=mapped_data,
                    status=status,
                    matched_contact_id=str(match["id"]),
                    match_confidence=confidence,
                    conflicts=conflicts if conflicts else None
                ))
            else:
                # New contact
                analyzed_rows.append(ImportRow(
                    row_number=row_number,
                    raw_data=raw_row,
                    mapped_data=mapped_data,
                    status="new",
                    matched_contact_id=None,
                    match_confidence=None,
                    conflicts=None
                ))

        logger.info(f"Analysis complete: {len(analyzed_rows)} rows - "
                   f"{sum(1 for r in analyzed_rows if r.status == 'new')} new, "
                   f"{sum(1 for r in analyzed_rows if r.status == 'duplicate')} duplicate, "
                   f"{sum(1 for r in analyzed_rows if r.status == 'conflict')} conflict")

        return analyzed_rows

    def _apply_mapping(self, raw_row: Dict[str, str], mapping: Dict[str, str]) -> Dict[str, Any]:
        """Apply column mapping to raw row data"""
        mapped = {}

        for csv_col, contact_field in mapping.items():
            value = raw_row.get(csv_col, "").strip()
            if value:
                # Special handling for certain fields
                if contact_field == "tags" and value:
                    # Split tags by comma or semicolon
                    mapped[contact_field] = [t.strip() for t in re.split(r'[,;]', value) if t.strip()]
                elif contact_field in ["budget_min", "budget_max"]:
                    # Parse numeric values
                    try:
                        cleaned = re.sub(r'[^\d.]', '', value)
                        mapped[contact_field] = float(cleaned) if cleaned else None
                    except ValueError:
                        pass
                elif contact_field == "date_of_birth":
                    # Try to parse date
                    parsed_date = self._parse_date(value)
                    if parsed_date:
                        mapped[contact_field] = parsed_date
                elif contact_field == "role":
                    # Validate and normalize role
                    normalized_role = self._validate_and_normalize_role(value)
                    if normalized_role:
                        mapped[contact_field] = normalized_role
                elif contact_field == "category":
                    # Validate and normalize category
                    normalized_category = self._validate_and_normalize_category(value)
                    if normalized_category:
                        mapped[contact_field] = normalized_category
                else:
                    mapped[contact_field] = value

        return mapped

    def _parse_date(self, value: str) -> Optional[str]:
        """Parse date string to YYYY-MM-DD format"""
        import re
        from datetime import datetime

        # Common date patterns
        patterns = [
            (r'(\d{4})-(\d{2})-(\d{2})', '%Y-%m-%d'),  # 2000-01-15
            (r'(\d{2})/(\d{2})/(\d{4})', '%d/%m/%Y'),  # 15/01/2000
            (r'(\d{2})-(\d{2})-(\d{4})', '%d-%m-%Y'),  # 15-01-2000
            (r'(\d{2})/(\d{2})/(\d{2})', '%d/%m/%y'),  # 15/01/00
        ]

        for pattern, fmt in patterns:
            if re.match(pattern, value):
                try:
                    dt = datetime.strptime(value, fmt)
                    return dt.strftime('%Y-%m-%d')
                except ValueError:
                    continue

        return None

    def _normalize_phone(self, phone: str) -> str:
        """Normalize phone number for comparison"""
        if not phone:
            return ""
        return re.sub(r'[^\d+]', '', phone)

    def _find_matching_contact(
        self,
        mapped_data: Dict[str, Any],
        email_index: Dict[str, Dict],
        phone_index: Dict[str, Dict],
        name_index: Dict[str, Dict]
    ) -> Tuple[Optional[Dict], Optional[float], Optional[str]]:
        """
        Find matching existing contact

        Returns: (matched_contact, confidence, match_type)
        """
        # Priority 1: Email match (highest confidence)
        if mapped_data.get("email"):
            email = mapped_data["email"].lower()
            if email in email_index:
                return email_index[email], 0.95, "email"

        # Priority 2: Phone match
        if mapped_data.get("phone"):
            phone = self._normalize_phone(mapped_data["phone"])
            if phone and phone in phone_index:
                return phone_index[phone], 0.90, "phone"

        # Priority 3: Full name match
        if mapped_data.get("first_name") and mapped_data.get("last_name"):
            name_key = f"{mapped_data['first_name']} {mapped_data['last_name']}".lower()
            if name_key in name_index:
                return name_index[name_key], 0.75, "name"

        return None, None, None

    def _detect_conflicts(
        self,
        mapped_data: Dict[str, Any],
        existing_contact: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Detect conflicting field values between import data and existing contact

        Returns list of conflicts with field name, existing value, and new value
        """
        conflicts = []

        # Fields to check for conflicts
        conflict_fields = [
            "phone", "company", "job_title", "address_street", "address_city",
            "address_state", "address_zip", "address_country", "notes",
            "date_of_birth", "place_of_birth", "role", "category"
        ]

        for field in conflict_fields:
            new_value = mapped_data.get(field)
            existing_value = existing_contact.get(field)

            # Both have values and they're different
            if new_value and existing_value:
                # Normalize for comparison
                new_normalized = str(new_value).strip().lower()
                existing_normalized = str(existing_value).strip().lower()

                if new_normalized != existing_normalized:
                    conflicts.append({
                        "field": field,
                        "existing": existing_value,
                        "new": new_value,
                        "keep": None  # User decides
                    })

        return conflicts

    async def execute_import(
        self,
        job_id: str,
        user_id: str,
        mode: str
    ) -> Dict[str, int]:
        """
        Execute the actual import (create/update contacts)

        Returns counts of created, updated, skipped
        """
        rows = await Database.get_import_rows_for_processing(job_id)
        logger.info(f"Executing import for job {job_id}: {len(rows)} rows to process")

        stats = {"created": 0, "updated": 0, "skipped": 0, "errors": 0}

        for row in rows:
            try:
                row_id = str(row["id"])
                mapped_data = row["mapped_data"]
                status = row["status"]
                matched_contact_id = row.get("matched_contact_id")
                decision = row.get("decision")
                overwrite_fields = row.get("overwrite_fields")

                if not mapped_data:
                    logger.warning(f"Row {row['row_number']}: No mapped data, skipping")
                    await Database.update_import_row_result(row_id, "skipped")
                    stats["skipped"] += 1
                    continue

                # Parse mapped_data if it's a string
                if isinstance(mapped_data, str):
                    mapped_data = json.loads(mapped_data)

                # Determine action based on status and decision
                if status == "new":
                    # Always create new contacts
                    contact_id = await Database.create_contact(user_id, mapped_data)
                    if contact_id:
                        await Database.update_import_row_result(row_id, "imported", contact_id)
                        stats["created"] += 1
                        logger.debug(f"Row {row['row_number']}: Created contact {contact_id}")
                    else:
                        await Database.update_import_row_result(row_id, "skipped", error="Failed to create")
                        stats["errors"] += 1

                elif status in ["duplicate", "conflict"]:
                    # Handle based on decision
                    if decision == "skip":
                        await Database.update_import_row_result(row_id, "skipped")
                        stats["skipped"] += 1

                    elif decision == "create":
                        # Create as new even though duplicate
                        contact_id = await Database.create_contact(user_id, mapped_data)
                        if contact_id:
                            await Database.update_import_row_result(row_id, "imported", contact_id)
                            stats["created"] += 1
                        else:
                            await Database.update_import_row_result(row_id, "skipped", error="Failed to create")
                            stats["errors"] += 1

                    elif decision == "update" or decision is None:
                        # Update existing contact
                        if matched_contact_id:
                            # Determine which fields to update
                            if overwrite_fields:
                                # Parse if string
                                if isinstance(overwrite_fields, str):
                                    overwrite_fields = json.loads(overwrite_fields)
                                # Only update specified fields
                                await Database.update_contact(
                                    matched_contact_id,
                                    mapped_data,
                                    only_empty_fields=False,
                                    specific_fields=overwrite_fields
                                )
                            else:
                                # Default: only fill empty fields (enrich mode)
                                await Database.update_contact(
                                    matched_contact_id,
                                    mapped_data,
                                    only_empty_fields=True
                                )

                            await Database.update_import_row_result(row_id, "imported", matched_contact_id)
                            stats["updated"] += 1
                            logger.debug(f"Row {row['row_number']}: Updated contact {matched_contact_id}")
                        else:
                            # No matched contact, create new
                            contact_id = await Database.create_contact(user_id, mapped_data)
                            if contact_id:
                                await Database.update_import_row_result(row_id, "imported", contact_id)
                                stats["created"] += 1
                            else:
                                stats["errors"] += 1

                    else:
                        # No decision made - in turbo mode, default to enrich
                        if mode == "turbo" and matched_contact_id:
                            await Database.update_contact(
                                matched_contact_id,
                                mapped_data,
                                only_empty_fields=True
                            )
                            await Database.update_import_row_result(row_id, "imported", matched_contact_id)
                            stats["updated"] += 1
                        else:
                            await Database.update_import_row_result(row_id, "skipped")
                            stats["skipped"] += 1

            except Exception as e:
                logger.error(f"Error processing row {row.get('row_number')}: {e}")
                await Database.update_import_row_result(
                    str(row["id"]),
                    "skipped",
                    error=str(e)
                )
                stats["errors"] += 1

        logger.info(f"Import complete: created={stats['created']}, updated={stats['updated']}, "
                   f"skipped={stats['skipped']}, errors={stats['errors']}")

        return stats
