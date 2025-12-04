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
        "job_title": ["job title", "titulo", "position", "cargo", "puesto", "role", "profession"],
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
    }

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

        analyzed_rows = []

        for i, raw_row in enumerate(rows, start=1):
            # Apply column mapping
            mapped_data = self._apply_mapping(raw_row, column_mapping)

            # Skip rows without required fields
            if not mapped_data.get("first_name") or not mapped_data.get("last_name"):
                logger.debug(f"Row {i}: Skipping - missing first_name or last_name")
                continue

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
                    row_number=i,
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
                    row_number=i,
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
            "date_of_birth", "place_of_birth"
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
