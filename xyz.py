# pdf_text_api.py
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
import fitz  # PyMuPDF
from fastapi.middleware.cors import CORSMiddleware
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # <-- Your Next.js frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    
)



def extract_text_from_pdf_file(pdf_bytes):
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    return " ".join([page.get_text() for page in doc])

@app.post("/extract-text")
async def extract_text(file: UploadFile = File(...)):
    pdf_bytes = await file.read()
    try:
        text = extract_text_from_pdf_file(pdf_bytes)
        return JSONResponse({"text": text})
    except Exception as e:
        return JSONResponse({"error": f"Failed to process PDF: {str(e)}"}, status_code=400)
