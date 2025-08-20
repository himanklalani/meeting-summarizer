import logging
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import fitz  # PyMuPDF

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://meeting-summarizer-eight.vercel.app"],  # Update with your actual Vercel frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def extract_text_from_pdf_file(pdf_bytes: bytes) -> str:
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        return " ".join([page.get_text() for page in doc])
    except Exception as e:
        logger.error(f"Error extracting text from PDF: {e}")
        raise

@app.post("/extract-text")
async def extract_text(file: UploadFile = File(...)):
    pdf_bytes = await file.read()
    try:
        text = extract_text_from_pdf_file(pdf_bytes)
        return JSONResponse({"text": text})
    except Exception as e:
        error_message = f"Failed to process PDF: {str(e)}"
        logger.error(error_message)
        raise HTTPException(status_code=400, detail=error_message)
