"""
Document extraction module for TankID Intake Agent

Uses Claude Sonnet 4 API to classify documents and extract tank data.
Handles PDFs via text extraction and images via vision API.
"""
import base64
import json
import logging
import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

import anthropic
import pdfplumber
import extract_msg

logger = logging.getLogger(__name__)

@dataclass
class ExtractionResult:
    """Result of document extraction"""
    document_type: str  # 'tank_chart', 'spec_sheet', 'installation_permit', 'other'
    confidence: float  # 0.0 to 1.0
    extracted_data: Dict[str, Any]  # Tank data fields
    raw_response: str  # Raw Claude response for debugging


class DocumentExtractor:
    """Extracts tank data from documents using Claude API"""
    
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))
        self.max_image_size = 20 * 1024 * 1024  # 20MB limit for Claude
        
    def extract_from_document(self, file_path: str) -> ExtractionResult:
        """
        Extract data from a document using appropriate method
        
        Args:
            file_path: Path to the document file
            
        Returns:
            ExtractionResult with classification and extracted data
        """
        try:
            file_ext = Path(file_path).suffix.lower()
            
            # Handle PDFs with text extraction
            if file_ext == '.pdf':
                return self._extract_from_pdf(file_path)
            
            # Handle images with vision API
            elif file_ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp']:
                return self._extract_from_image(file_path)
            
            # Handle .msg email files
            elif file_ext == '.msg':
                return self._extract_from_msg(file_path)
            
            # Handle plain text files
            elif file_ext == '.txt':
                return self._extract_from_text(file_path)
            
            # Handle markdown files (for testing/development)
            elif file_ext == '.md':
                return self._extract_from_markdown(file_path)
            
            else:
                logger.warning(f"Unsupported file type: {file_ext}")
                return ExtractionResult(
                    document_type="other",
                    confidence=0.0,
                    extracted_data={},
                    raw_response="Unsupported file type"
                )
                
        except Exception as e:
            logger.error(f"Error extracting from {file_path}: {e}")
            return ExtractionResult(
                document_type="other",
                confidence=0.0,
                extracted_data={},
                raw_response=f"Extraction error: {e}"
            )
    
    def _extract_from_pdf(self, file_path: str) -> ExtractionResult:
        """Extract text from PDF and send to Claude as text-only"""
        try:
            # Extract text from PDF
            text_content = ""
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text_content += page_text + "\\n\\n"
            
            if not text_content.strip():
                logger.warning(f"No text found in PDF: {file_path} — trying vision fallback")
                return self._extract_from_pdf_vision(file_path)
            
            # Prepare the extraction prompt with PDF text
            filename = Path(file_path).stem  # e.g. FL-2001-01_Drawing
            prompt = self._build_extraction_prompt()
            prompt += f"\\n\\nFilename (for context, use to infer tank_id if present): {filename}"
            prompt += f"\\n\\nDocument text content:\\n{text_content[:10000]}"  # Limit to 10k chars
            
            # Make API call to Claude (text-only)
            message = self.client.messages.create(
                model="claude-sonnet-4-5",
                max_tokens=4000,
                temperature=0.1,
                messages=[{
                    "role": "user",
                    "content": prompt
                }]
            )
            
            # Parse Claude's response
            response_text = message.content[0].text
            result = self._parse_claude_response(response_text)
            # Fallback: infer tank_id from filename if not extracted
            if not result.extracted_data.get('tank_id'):
                import re as _re
                m = _re.match(r'((?:[A-Z]{2}-\d{4}-\d{2}|[A-Z]+-\d+))', filename)
                if m:
                    result.extracted_data['tank_id'] = m.group(1)
            return result
            
        except Exception as e:
            logger.error(f"Error extracting from PDF {file_path}: {e}")
            return ExtractionResult(
                document_type="other",
                confidence=0.0,
                extracted_data={},
                raw_response=f"PDF extraction error: {e}"
            )
    
    def _extract_from_pdf_vision(self, file_path: str) -> ExtractionResult:
        """Extract data from image-only PDF using Claude Vision API (page-by-page)."""
        try:
            import fitz  # PyMuPDF
        except ImportError:
            logger.warning("PyMuPDF not installed — cannot do PDF vision fallback. Run: pip install pymupdf")
            return ExtractionResult(document_type="other", confidence=0.0, extracted_data={}, raw_response="PyMuPDF not available")

        try:
            filename = Path(file_path).stem
            prompt = self._build_extraction_prompt()
            prompt += f"\n\nFilename (for context): {filename}"
            prompt += "\n\nThis is a scanned PDF. Extract all visible information from the page images below."

            doc = fitz.open(file_path)
            content_blocks = [{"type": "text", "text": prompt}]

            for page_num in range(min(len(doc), 4)):  # cap at 4 pages
                page = doc[page_num]
                pix = page.get_pixmap(dpi=150)
                img_bytes = pix.tobytes("png")
                if len(img_bytes) > self.max_image_size:
                    pix = page.get_pixmap(dpi=100)
                    img_bytes = pix.tobytes("png")
                encoded = base64.b64encode(img_bytes).decode("utf-8")
                content_blocks.append({
                    "type": "image",
                    "source": {"type": "base64", "media_type": "image/png", "data": encoded}
                })

            doc.close()

            response = self.client.messages.create(
                model="claude-opus-4-5",
                max_tokens=2000,
                messages=[{"role": "user", "content": content_blocks}]
            )

            response_text = response.content[0].text
            return self._parse_claude_response(response_text)

        except Exception as e:
            logger.error(f"PDF vision extraction failed for {file_path}: {e}")
            return ExtractionResult(document_type="other", confidence=0.0, extracted_data={}, raw_response=f"Vision error: {e}")

    def _extract_from_image(self, file_path: str) -> ExtractionResult:
        """Extract data from image using Claude Vision API"""
        try:
            # Check file size
            if os.path.getsize(file_path) > self.max_image_size:
                logger.warning(f"File {file_path} exceeds size limit, skipping")
                return ExtractionResult(
                    document_type="other",
                    confidence=0.0,
                    extracted_data={},
                    raw_response="File too large"
                )
            
            # Read and encode file
            with open(file_path, 'rb') as f:
                file_data = f.read()
            
            file_ext = Path(file_path).suffix.lower()
            
            # Determine media type for images
            if file_ext in ['.jpg', '.jpeg']:
                media_type = "image/jpeg"
            elif file_ext == '.png':
                media_type = "image/png"
            elif file_ext == '.gif':
                media_type = "image/gif"
            elif file_ext == '.webp':
                media_type = "image/webp"
            else:
                logger.warning(f"Unsupported image type: {file_ext}")
                return ExtractionResult(
                    document_type="other",
                    confidence=0.0,
                    extracted_data={},
                    raw_response="Unsupported image type"
                )
            
            # Encode file data
            encoded_data = base64.b64encode(file_data).decode('utf-8')
            
            # Prepare the extraction prompt
            prompt = self._build_extraction_prompt()
            
            # Make API call to Claude Vision
            message = self.client.messages.create(
                model="claude-sonnet-4-5",
                max_tokens=4000,
                temperature=0.1,
                messages=[{
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": prompt
                        },
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": encoded_data
                            }
                        }
                    ]
                }]
            )
            
            # Parse Claude's response
            response_text = message.content[0].text
            return self._parse_claude_response(response_text)
            
        except Exception as e:
            logger.error(f"Error extracting from image {file_path}: {e}")
            return ExtractionResult(
                document_type="other",
                confidence=0.0,
                extracted_data={},
                raw_response=f"Image extraction error: {e}"
            )
    
    def _extract_from_msg(self, file_path: str) -> ExtractionResult:
        """Extract data from .msg email files"""
        try:
            logger.info(f"Extracting from MSG file: {file_path}")
            
            # Extract email content using extract_msg library
            msg = extract_msg.openMsg(file_path)
            
            # Combine email content for analysis
            email_content = f"Subject: {msg.subject or 'No subject'}\n\n"
            email_content += f"From: {msg.sender or 'Unknown sender'}\n\n"
            
            if msg.body:
                email_content += f"Body:\n{msg.body}\n\n"
            
            # Process attachments
            attachments_info = []
            if hasattr(msg, 'attachments') and msg.attachments:
                for i, attachment in enumerate(msg.attachments):
                    if hasattr(attachment, 'longFilename') and attachment.longFilename:
                        attachments_info.append(f"Attachment {i+1}: {attachment.longFilename}")
            
            if attachments_info:
                email_content += "Attachments:\n" + "\n".join(attachments_info)
            
            # Close the message
            msg.close()
            
            # Send to Claude for analysis
            prompt = self._build_extraction_prompt()
            
            message = self.client.messages.create(
                model="claude-sonnet-4-5",
                max_tokens=4000,
                temperature=0.1,
                messages=[
                    {
                        "role": "user",
                        "content": f"{prompt}\n\nEmail Content:\n{email_content}"
                    }
                ]
            )
            
            # Parse Claude's response
            response_text = message.content[0].text
            return self._parse_claude_response(response_text)
            
        except Exception as e:
            logger.error(f"Error extracting from MSG file {file_path}: {e}")
            return ExtractionResult(
                document_type="other",
                confidence=0.0,
                extracted_data={},
                raw_response=f"MSG extraction error: {e}"
            )

    def _build_extraction_prompt(self) -> str:
        """Build the extraction prompt for Claude"""
        return '''
You are a document processing system for TankID. Analyze this document and extract tank information.

**Document Classification:**
Classify as ONE of:
- tank_chart: Tank capacity chart with readings/volumes
- spec_sheet: Tank specifications/technical data  
- installation_permit: Installation/construction permit
- registration: Tank or facility registration form
- purchase_order: Purchase order or sales order for tank equipment
- other: Any other document type

**Tank Data to Extract:**
- serial_number: Tank serial number
- tank_id: Tank identifier as labeled on the document (e.g. FL-2001-01, Tank 1, T-001)
- tank_type: Underground storage tank (UST) or above-ground storage tank (AST)
- manufacturer: Tank manufacturer name
- material: Tank material (steel, fiberglass, etc.)
- capacity_gallons: Tank capacity in gallons
- installation_date: Installation date (YYYY-MM-DD format)
- contents: What the tank stores (gasoline, diesel, etc.)
- dimensions: Tank dimensions (length x width x height)
- coating_type: Tank coating or corrosion protection type
- monitoring_system: Leak detection/monitoring system type

**Facility Data to Extract:**
- facility_name: Facility/business name
- facility_address: Complete street address
- facility_city: City name
- facility_state: State abbreviation (2 letters)
- facility_zip: ZIP code
- facility_county: County name if present
- facility_type: Type of facility (e.g. fuel depot, gas station, industrial, hospital)
- client_facility_id: Facility ID or number assigned by the client/owner (e.g. FL-2001, 1005, FAC-003)
- state_facility_id: Facility ID or number assigned by the state regulator if present
- owner_name: Name of the facility owner or operator if present
- facility_phone: Facility phone number if present

**Response Format:**
Return ONLY valid JSON:
```json
{
  "classification": "tank_chart|spec_sheet|installation_permit|other",
  "confidence": 0.85,
  "extracted_data": {
    "serial_number": "value or null",
    "tank_id": "value or null",
    "tank_type": "value or null",
    "manufacturer": "value or null",
    "material": "value or null",
    "capacity_gallons": "value or null",
    "installation_date": "value or null",
    "contents": "value or null",
    "dimensions": "value or null",
    "coating_type": "value or null",
    "monitoring_system": "value or null",
    "facility_name": "value or null",
    "facility_address": "value or null",
    "facility_city": "value or null",
    "facility_state": "value or null",
    "facility_zip": "value or null",
    "facility_county": "value or null",
    "facility_type": "value or null",
    "client_facility_id": "value or null",
    "state_facility_id": "value or null",
    "owner_name": "value or null",
    "facility_phone": "value or null"
  },
  "reasoning": "Brief explanation of classification and key findings"
}
```

**Important Rules:**
- Return confidence 0.0-1.0 based on data quality and completeness
- Use null for missing/unclear data, never guess
- For dates, use YYYY-MM-DD format or null
- For addresses, be as complete as possible
- Tank charts typically have capacity/volume tables
- Spec sheets have technical specifications and part numbers
- Installation permits have regulatory/approval information
- **Scan the ENTIRE document**: letter headings, form fields, signature blocks, headers, footers, and tables all contain useful data
- For permits/applications: the facility name, address, and owner often appear in the letterhead or the top section of page 1
- For multi-page forms: page 2 and 3 often contain tank details (serial, capacity, type) in tabular form — read every page
- Extract phone numbers into facility_phone (any format)
- If the document references a facility number, permit number, or tank ID in any field, capture it
- For owner_name: look for "Owner", "Operator", "Company", "Responsible Party", or the entity name in a letterhead
- **tank_id**: look for any field labeled "Tank ID", "Tank ID Number", "(Ops Use) Tank ID Number", "Tank No", or similar — this is the primary tank identifier used by the operator
- **facility_city**: prefer the city from a "City/State/Zip" or "City, State ZIP" line in a form field over any city that appears in a mailing address header or company letterhead
- **serial_number**: look for fields labeled "Serial No", "Serial Number", "S/N", "Tank Serial", or a sequence number printed on the tank specification section
'''

    def _parse_claude_response(self, response_text: str) -> ExtractionResult:
        """Parse Claude's JSON response into ExtractionResult"""
        try:
            # Extract JSON from response (handle markdown code blocks)
            json_match = re.search(r'```json\s*(.+?)\s*```', response_text, re.DOTALL)
            if json_match:
                json_str = json_match.group(1)
            else:
                # Try to find JSON without markdown
                json_str = response_text.strip()
            
            # Parse JSON
            data = json.loads(json_str)
            
            # Extract fields with defaults
            doc_type = data.get('classification', 'other')
            confidence = float(data.get('confidence', 0.0))
            extracted_data = data.get('extracted_data', {})
            
            # Clean up extracted data (remove null values, normalize)
            cleaned_data = {}
            for key, value in extracted_data.items():
                if value is not None and value != "" and value != "null":
                    # Normalize common fields
                    if key == 'facility_state' and isinstance(value, str):
                        value = value.upper()[:2]  # State abbreviation
                    cleaned_data[key] = value
            
            return ExtractionResult(
                document_type=doc_type,
                confidence=confidence,
                extracted_data=cleaned_data,
                raw_response=response_text
            )
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Claude response as JSON: {e}")
            logger.error(f"Raw response: {response_text}")
            return ExtractionResult(
                document_type="other",
                confidence=0.0,
                extracted_data={},
                raw_response=response_text
            )
        except Exception as e:
            logger.error(f"Error parsing Claude response: {e}")
            return ExtractionResult(
                document_type="other",
                confidence=0.0,
                extracted_data={},
                raw_response=response_text
            )

    def _extract_from_text(self, file_path: str) -> ExtractionResult:
        """Extract tank data from plain text files"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                text_content = f.read()
            
            filename = Path(file_path).stem
            logger.info(f"Processing text file: {file_path} ({len(text_content)} chars)")
            
            prompt = self._build_extraction_prompt()
            prompt += f"\n\nFilename (for context): {filename}"
            prompt += f"\n\nDocument text content:\n{text_content[:10000]}"
            
            message = self.client.messages.create(
                model="claude-sonnet-4-5",
                max_tokens=4000,
                temperature=0.1,
                messages=[{"role": "user", "content": prompt}]
            )
            
            response_text = message.content[0].text
            result = self._parse_claude_response(response_text)
            # Fallback: infer tank_id from filename if not extracted
            if not result.extracted_data.get('tank_id'):
                import re as _re
                m = _re.match(r'((?:[A-Z]{2}-\d{4}-\d{2}|[A-Z]+-\d+))', filename)
                if m:
                    result.extracted_data['tank_id'] = m.group(1)
            return result
            
        except Exception as e:
            logger.error(f"Error extracting from text file {file_path}: {e}")
            return ExtractionResult(
                document_type="other",
                confidence=0.0,
                extracted_data={},
                raw_response=f"Text extraction error: {e}"
            )

    def _extract_from_markdown(self, file_path: str) -> ExtractionResult:
        """Extract tank data from markdown files (for testing/development)"""
        try:
            # Read markdown file as plain text
            with open(file_path, 'r', encoding='utf-8') as f:
                text_content = f.read()
            
            logger.info(f"Processing markdown file: {file_path}")
            logger.info(f"Content length: {len(text_content)} characters")
            
            # Use Claude to extract data from markdown content
            prompt = self._build_extraction_prompt()
            
            message = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=1024,
                messages=[
                    {
                        "role": "user",
                        "content": f"{prompt}\n\nMarkdown Document Content:\n{text_content}"
                    }
                ]
            )
            
            # Parse Claude's response
            response_text = message.content[0].text
            return self._parse_claude_response(response_text)
            
        except Exception as e:
            logger.error(f"Error extracting from markdown file {file_path}: {e}")
            return ExtractionResult(
                document_type="other",
                confidence=0.0,
                extracted_data={},
                raw_response=f"Markdown extraction error: {e}"
            )


def extract_document_batch(file_paths: List[str]) -> List[ExtractionResult]:
    """
    Extract data from multiple documents
    
    Args:
        file_paths: List of file paths to process
        
    Returns:
        List of ExtractionResult objects
    """
    extractor = DocumentExtractor()
    results = []
    
    for file_path in file_paths:
        logger.info(f"Extracting from: {file_path}")
        result = extractor.extract_from_document(file_path)
        results.append(result)
        logger.info(f"Extracted: {result.document_type} (confidence: {result.confidence:.2f})")
    
    return results


if __name__ == "__main__":
    # Test the extractor
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python extractor.py <file_path>")
        sys.exit(1)
    
    file_path = sys.argv[1]
    extractor = DocumentExtractor()
    result = extractor.extract_from_document(file_path)
    
    print(f"Document Type: {result.document_type}")
    print(f"Confidence: {result.confidence}")
    print(f"Extracted Data: {json.dumps(result.extracted_data, indent=2)}")