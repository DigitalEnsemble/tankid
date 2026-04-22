#!/usr/bin/env python3
"""
MSG to PDF Converter for TankID
Converts Outlook .msg files to PDF format for better archival storage
"""
import os
import sys
import logging
from pathlib import Path
from typing import Optional, List
import fitz  # PyMuPDF
import extract_msg
from datetime import datetime

logger = logging.getLogger(__name__)

class MSGtoPDFConverter:
    """Converts Outlook .msg files to PDF format"""
    
    def __init__(self, output_dir: str = None):
        self.output_dir = output_dir or "converted_pdfs"
        os.makedirs(self.output_dir, exist_ok=True)
    
    def convert_msg_to_pdf(self, msg_path: str, output_path: str = None) -> Optional[str]:
        """Convert a single .msg file to PDF"""
        try:
            logger.info(f"📧 Converting .msg to PDF: {os.path.basename(msg_path)}")
            
            # Extract message content
            msg = extract_msg.openMsg(msg_path)
            
            # Get message components
            subject = msg.subject or "No Subject"
            sender = msg.sender or "Unknown Sender"
            date = msg.date or datetime.now()
            body = msg.body or "(No message body)"
            # Handle recipients safely
            recipients = "Unknown Recipients"
            if hasattr(msg, 'recipients') and msg.recipients:
                try:
                    recipient_list = []
                    for r in msg.recipients:
                        if hasattr(r, 'email'):
                            recipient_list.append(r.email)
                        elif hasattr(r, 'name'):
                            recipient_list.append(r.name)
                        else:
                            recipient_list.append(str(r))
                    recipients = ", ".join(recipient_list)
                except Exception as e:
                    logger.warning(f"Failed to parse recipients: {e}")
                    recipients = "Unknown Recipients"
            
            # Create PDF content
            content = f"""OUTLOOK EMAIL MESSAGE

Subject: {subject}
From: {sender}
To: {recipients}
Date: {date}

{'='*60}

{body}

{'='*60}

Converted from: {os.path.basename(msg_path)}
Conversion Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
TankID Intake Agent
"""
            
            # Generate output path if not provided
            if not output_path:
                base_name = os.path.splitext(os.path.basename(msg_path))[0]
                output_path = os.path.join(self.output_dir, f"{base_name}_converted.pdf")
            
            # Create PDF using PyMuPDF
            doc = fitz.open()  # Create empty PDF
            page = doc.new_page()  # Add a page
            
            # Insert text with formatting
            rect = fitz.Rect(50, 50, 550, 750)  # Text area
            page.insert_textbox(rect, content, fontsize=10, fontname="helv")
            
            # Save PDF
            doc.save(output_path)
            doc.close()
            
            # Handle attachments if any
            attachments_info = []
            if hasattr(msg, 'attachments') and msg.attachments:
                logger.info(f"📎 Found {len(msg.attachments)} attachments")
                for i, attachment in enumerate(msg.attachments):
                    if hasattr(attachment, 'longFilename') and attachment.longFilename:
                        attachments_info.append(f"  {i+1}. {attachment.longFilename}")
                    elif hasattr(attachment, 'shortFilename') and attachment.shortFilename:
                        attachments_info.append(f"  {i+1}. {attachment.shortFilename}")
                
                # Add attachment info to PDF if present
                if attachments_info:
                    attachment_text = f"\n\nATTACHMENTS:\n" + "\n".join(attachments_info)
                    
                    # Create new page for attachments info
                    att_page = doc.new_page()
                    att_rect = fitz.Rect(50, 50, 550, 200)
                    att_page.insert_textbox(att_rect, attachment_text, fontsize=10, fontname="helv")
                    
                    # Re-save with attachment info
                    doc.save(output_path)
                    doc.close()
            
            msg.close()
            
            logger.info(f"✅ Converted to PDF: {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"❌ Failed to convert {msg_path}: {e}")
            return None
    
    def batch_convert_msgs(self, input_dir: str) -> List[str]:
        """Convert all .msg files in a directory to PDF"""
        converted_files = []
        
        for root, dirs, files in os.walk(input_dir):
            for file in files:
                if file.lower().endswith('.msg'):
                    msg_path = os.path.join(root, file)
                    pdf_path = self.convert_msg_to_pdf(msg_path)
                    if pdf_path:
                        converted_files.append(pdf_path)
        
        return converted_files
    
    def convert_with_preserved_name(self, msg_path: str, preserve_timestamp: bool = True) -> Optional[str]:
        """Convert .msg with preserved original filename structure"""
        try:
            base_name = os.path.basename(msg_path)
            
            # Remove .msg extension and add .pdf
            if preserve_timestamp and base_name.startswith('2026-'):
                # Keep timestamp prefix: 2026-04-14T23-25-26.576Z_OFL... 
                pdf_name = base_name.replace('.msg', '_EMAIL.pdf')
            else:
                # Clean name for non-timestamped files
                pdf_name = base_name.replace('.msg', '_EMAIL.pdf')
            
            output_path = os.path.join(self.output_dir, pdf_name)
            return self.convert_msg_to_pdf(msg_path, output_path)
            
        except Exception as e:
            logger.error(f"❌ Failed to convert with preserved name {msg_path}: {e}")
            return None

# CLI usage
def main():
    import argparse
    parser = argparse.ArgumentParser(description='Convert .msg files to PDF')
    parser.add_argument('msg_path', help='Path to .msg file or directory')
    parser.add_argument('--output-dir', default='converted_pdfs', help='Output directory for PDFs')
    parser.add_argument('--preserve-names', action='store_true', help='Preserve original filenames')
    
    args = parser.parse_args()
    
    converter = MSGtoPDFConverter(args.output_dir)
    
    if os.path.isfile(args.msg_path):
        # Single file
        if args.preserve_names:
            pdf_path = converter.convert_with_preserved_name(args.msg_path)
        else:
            pdf_path = converter.convert_msg_to_pdf(args.msg_path)
        
        if pdf_path:
            print(f"✅ Converted: {pdf_path}")
        else:
            print("❌ Conversion failed")
            sys.exit(1)
    
    elif os.path.isdir(args.msg_path):
        # Directory batch
        converted_files = converter.batch_convert_msgs(args.msg_path)
        print(f"✅ Converted {len(converted_files)} files")
        for file in converted_files:
            print(f"   📄 {file}")
    
    else:
        print(f"❌ Invalid path: {args.msg_path}")
        sys.exit(1)

if __name__ == "__main__":
    main()