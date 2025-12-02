"""
Contact Matching Worker - AI-powered contact matching for document linking

Uses Deepseek AI to intelligently match extracted names from documents
to existing contacts in the database.
"""

import httpx
import json
from typing import List, Dict, Any, Optional
from loguru import logger
from app.config import settings


class ContactMatchingWorker:
    """
    Matches extracted names from documents to existing contacts using AI
    """

    def __init__(self):
        if not settings.deepseek_api_key:
            raise ValueError("DEEPSEEK_API_KEY is required for contact matching")
        self.api_key = settings.deepseek_api_key
        self.model = "deepseek-chat"
        self.api_url = "https://api.deepseek.com/v1/chat/completions"

    async def match_contact(
        self,
        extracted_name: str,
        candidates: List[Dict[str, Any]],
        document_context: Optional[Dict[str, Any]] = None
    ) -> Optional[str]:
        """
        Use AI to match an extracted name to the best contact candidate.

        Args:
            extracted_name: The name extracted from the document (e.g., "John Doe")
            candidates: List of contact candidates with their metadata
            document_context: Additional context from document (addresses, locations, emails, phones)

        Returns:
            Contact ID if confident match found (confidence >= 0.8), else None
        """
        if not candidates:
            logger.debug(f"No candidates for '{extracted_name}', skipping match")
            return None

        # Build prompt with candidates and document context
        prompt = self._build_matching_prompt(extracted_name, candidates, document_context)

        try:
            # Call Deepseek API
            response = await self._call_deepseek_api(prompt)

            # Parse response
            result = self._parse_matching_response(response)

            # Validate confidence threshold
            if result.get("confidence", 0) >= 0.8:
                matched_contact_id = result.get("contact_id")
                if matched_contact_id and matched_contact_id != "none":
                    logger.info(
                        f"✅ Matched '{extracted_name}' → Contact {matched_contact_id} "
                        f"(confidence: {result['confidence']:.2f})"
                    )
                    return matched_contact_id
                else:
                    logger.debug(
                        f"❌ No confident match for '{extracted_name}' "
                        f"(confidence: {result.get('confidence', 0):.2f})"
                    )
            else:
                logger.debug(
                    f"⚠️ Low confidence for '{extracted_name}' "
                    f"({result.get('confidence', 0):.2f}), skipping"
                )

            return None

        except Exception as e:
            logger.error(f"Failed to match contact for '{extracted_name}': {e}")
            return None

    def _build_matching_prompt(
        self,
        extracted_name: str,
        candidates: List[Dict[str, Any]],
        document_context: Optional[Dict[str, Any]] = None
    ) -> str:
        """Build the prompt for AI contact matching"""

        # Format candidates for the prompt
        candidates_text = []
        for i, candidate in enumerate(candidates, 1):
            candidate_info = [
                f"Candidate {i}:",
                f"  ID: {candidate['id']}",
                f"  Name: {candidate['first_name']} {candidate['last_name']}",
            ]

            if candidate.get("email"):
                candidate_info.append(f"  Email: {candidate['email']}")
            if candidate.get("phone"):
                candidate_info.append(f"  Phone: {candidate['phone']}")
            if candidate.get("date_of_birth"):
                candidate_info.append(f"  Date of Birth: {candidate['date_of_birth']}")
            if candidate.get("place_of_birth"):
                candidate_info.append(f"  Place of Birth: {candidate['place_of_birth']}")
            if candidate.get("company"):
                candidate_info.append(f"  Company: {candidate['company']}")
            if candidate.get("job_title"):
                candidate_info.append(f"  Job Title: {candidate['job_title']}")
            if candidate.get("address_city") or candidate.get("address_state"):
                location = f"{candidate.get('address_city', '')}, {candidate.get('address_state', '')}".strip(
                    ", "
                )
                candidate_info.append(f"  Location: {location}")

            candidates_text.append("\n".join(candidate_info))

        # Build document context section
        context_section = ""
        if document_context:
            context_parts = []

            # Add extracted addresses/locations
            if document_context.get("extracted_addresses"):
                addresses = document_context["extracted_addresses"]
                context_parts.append(f"**Locations/Addresses mentioned in document:** {', '.join(addresses)}")

            # Add any other useful context
            if document_context.get("ocr_snippet"):
                context_parts.append(f"**Document text excerpt:** {document_context['ocr_snippet'][:300]}...")

            if context_parts:
                context_section = "\n\n" + "\n".join(context_parts) + "\n"

        prompt = f"""You are an expert at matching person names from documents to database contacts.

**Extracted name from document:** "{extracted_name}"{context_section}

**Available contact candidates:**
{chr(10).join(candidates_text)}

**Your task:**
1. Determine which candidate (if any) best matches the extracted name
2. Consider:
   - Name similarity (exact match, nicknames, spelling variations)
   - **Date of birth and place of birth** (CRITICAL for ID/passport/identification documents)
   - If multiple candidates have similar names, use context clues:
     * **Dates of birth from document** (IDs, passports always show this)
     * **Places of birth from document** (IDs, passports always show this)
     * Locations/addresses mentioned in the document
     * Company names
     * Email addresses or phone numbers
     * Job titles
3. **IMPORTANT:** If the document mentions specific locations/addresses, prioritize candidates from those locations
4. **IMPORTANT:** For identification documents (IDs, passports, DNI, NIE), date and place of birth are the strongest matching signals
5. Be conservative - only match if you're confident (>= 0.75 certainty)
6. If unsure or no good match, return "none"

**Response format (JSON only, no explanation):**
```json
{{
  "contact_id": "candidate-id-here or 'none'",
  "confidence": 0.95,
  "reasoning": "Brief explanation of why this is the best match"
}}
```

**Example:**

**Extracted name from document:** "John Doe"

**Locations/Addresses mentioned in document:** Basel, Switzerland

**Available contact candidates:**
Candidate 1:
  ID: 123
  Name: John Doe
  Email: johndoe@example.com
  Location: Valencia, Spain

Candidate 2:
  ID: 124
  Name: John Doe
  Email: johndoe@gmail.com
  Location: Basel, Switzerland

```json
{{
  "contact_id": "124",
  "confidence": 0.95,
  "reasoning": "Name matches and contact location (Basel, Switzerland) matches the document location"
}}
```"""

        return prompt

    async def _call_deepseek_api(self, prompt: str) -> str:
        """Call Deepseek API with the matching prompt"""

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                self.api_url,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.model,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.1,  # Low temperature for deterministic matching
                    "max_tokens": 300,
                    "response_format": {"type": "json_object"},
                },
            )
            response.raise_for_status()
            data = response.json()

            if not data.get("choices"):
                raise ValueError("No response from Deepseek API")

            content = data["choices"][0]["message"]["content"]
            return content

    def _parse_matching_response(self, response: str) -> Dict[str, Any]:
        """Parse the JSON response from Deepseek"""

        try:
            # Remove markdown code blocks if present
            if "```json" in response:
                response = response.split("```json")[1].split("```")[0].strip()
            elif "```" in response:
                response = response.split("```")[1].split("```")[0].strip()

            result = json.loads(response)

            # Validate required fields
            if "contact_id" not in result:
                raise ValueError("Missing 'contact_id' in response")
            if "confidence" not in result:
                result["confidence"] = 0.0

            return result

        except json.JSONDecodeError as e:
            logger.error(
                f"Failed to parse AI matching response: {e}\nResponse: {response}"
            )
            return {"contact_id": "none", "confidence": 0.0, "reasoning": "Parse error"}
        except Exception as e:
            logger.error(f"Error parsing matching response: {e}")
            return {"contact_id": "none", "confidence": 0.0, "reasoning": str(e)}
