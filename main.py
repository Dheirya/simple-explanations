from fastapi import FastAPI, HTTPException, Depends, File, UploadFile, Form
from starlette.responses import JSONResponse, PlainTextResponse
from email_validator import validate_email, EmailNotValidError
from fastapi_csrf_protect.exceptions import CsrfProtectError
from starlette.middleware.sessions import SessionMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from fastapi.middleware.cors import CORSMiddleware
from fastapi_csrf_protect import CsrfProtect
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from pydantic_settings import BaseSettings
from database import engine, SessionLocal
from datetime import datetime, timedelta
from sqlalchemy.orm import selectinload
from email.message import EmailMessage
from sqlalchemy import func, update
from sqlalchemy.orm import Session
from typing import Annotated
from schemas import *
from admin import *
import tempfile
import pikepdf
import smtplib
import os.path
import models
import string
import random
import shutil
import magic
import httpx
import nh3
import re


ORIGINS = ["https://simplexp.org"]
SECRET_KEY = os.environ.get("SECRET_KEY")
SECRET_KEY2 = os.environ.get("SECRET_KEY2")
ADMIN_URL = os.environ.get("ADMIN_URL")
RECAPTCHA_SECRET_KEY = os.environ.get("RECAPTCHA_SECRET_KEY")
EMAIL_PASSWORD = os.environ.get("EMAIL_PASSWORD")
MAX_FILE_SIZE = 10 * 1024 * 1024
EMAIL_HOST = "smtp.gmail.com"
EMAIL_PORT = 587
limiter = Limiter(key_func=get_remote_address, default_limits=["20/second", "100/minute", "1000/hour"])  # MAKE SURE THIS WORKS OVER CROSS SITE REQUESTS VIA FETCH
app = FastAPI(redoc_url=None, docs_url=None, title="Simple Explanations API", description="API for Simple Explanations project", version="1.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


class CsrfSettings(BaseSettings):
    secret_key: str = SECRET_KEY2
    cookie_domain: str = ".simplexp.org"
    cookie_samesite: str = "lax"
    cookie_secure: bool = True


def sanitize_text_field(text: str, max_length: int = 280, full: bool = True) -> str:
    text = text.strip()[:max_length]
    if not full:
        return re.sub(r'[^A-Za-z0-9-]', '_', text)
    return re.sub(r'[^A-Za-z0-9 _.,!?;:\'"()&+\-/@]', ' ', text)


def sanitize_subject(text: str, max_length: int = 100) -> str:
    text = text.replace('\r', ' ').replace('\n', ' ').strip()[:max_length]
    return re.sub(r'[^A-Za-z0-9 ._-]', '', text)


def sanitize_body(text: str, max_length: int = 1000) -> str:
    text = text.strip()[:max_length]
    return nh3.clean(text, tags=set(), attributes={})


def send_email(subject: str, body: str):
    msg = EmailMessage()
    msg['Subject'] = sanitize_subject(subject)
    msg['From'] = EMAIL
    msg['To'] = EMAIL
    msg.set_content(sanitize_body(body))
    with smtplib.SMTP(EMAIL_HOST, EMAIL_PORT) as server:
        server.starttls()
        server.login(EMAIL, EMAIL_PASSWORD)
        server.send_message(msg)


@CsrfProtect.load_config
def get_csrf_config():
    return CsrfSettings()


app.add_middleware(SessionMiddleware, secret_key=SECRET_KEY, https_only=True, same_site="lax", max_age=3600, domain=".simplexp.org")
app.add_middleware(CORSMiddleware, allow_origins=ORIGINS, allow_credentials=True, allow_methods=["GET", "POST"], allow_headers=["Content-Type", "X-CSRF-Token"])


@app.get(f"/{ADMIN_URL}/")
async def custom_admin_home():
    return RedirectResponse(url=f"/{ADMIN_URL}/sheet/list")

admin = Admin(app=app, engine=engine, authentication_backend=AdminAuth(SECRET_KEY), base_url=f'/{ADMIN_URL}')
admin.app.router.add_route(CALLBACK_URL, login_google)
models.Base.metadata.create_all(bind=engine)
admin.add_view(CategoryView)
admin.add_view(SheetView)
admin.add_view(TagView)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


dp_dependency = Annotated[Session, Depends(get_db)]


async def verify(csrf_protect: CsrfProtect, request: Request):
    try:
        await csrf_protect.validate_csrf(request)
    except Exception:
        raise HTTPException(status_code=403, detail="CSRF validation failed")


async def verify_origin(request: Request):
    origin = request.headers.get("origin")
    if origin not in ORIGINS:
        raise HTTPException(status_code=403, detail="Unauthorized origin")


async def verify_recaptcha(token: str) -> bool:
    url = "https://www.google.com/recaptcha/api/siteverify"
    payload = {"secret": RECAPTCHA_SECRET_KEY, "response": token}
    async with httpx.AsyncClient() as client:
        response = await client.post(url, data=payload)
        result = response.json()
        return result.get("success", False)


@app.exception_handler(CsrfProtectError)
def csrf_protect_exception_handler(request: Request, exc: CsrfProtectError):
    return JSONResponse(status_code=exc.status_code, content={'detail': exc.message})


@app.get("/testIP/")
async def test_ip(request: Request):
    ip = get_remote_address(request)
    return {"ip": ip}
    

@app.get("/csrf")
async def get_csrf_token(request: Request, response: Response, csrf_protect: CsrfProtect = Depends()):
    await verify_origin(request)
    csrf_token, signed_token = csrf_protect.generate_csrf_tokens()
    csrf_protect.set_csrf_cookie(signed_token, response)
    return {"csrf_token": csrf_token}


@app.get("/ping", response_class=PlainTextResponse)
async def ping(request: Request):
    await verify_origin(request)
    return ""


@app.post("/contact/")
@limiter.limit("2/minute")
@limiter.limit("3/day")
async def contact(request: Request,  db: dp_dependency, email: str = Form(...), message: str = Form(...), csrf_protect: CsrfProtect = Depends(CsrfProtect), recaptcha_response: str = Form(...)):
    await verify(csrf_protect, request)
    await verify_origin(request)
    if not await verify_recaptcha(recaptcha_response):
        raise HTTPException(status_code=400, detail="Invalid reCAPTCHA. Please try again.")
    if len(email) > 256 or len(message) > 1000:
        raise HTTPException(status_code=400, detail="Sorry, this email or message exceeds the maximum length!")
    try:
        email_info = validate_email(email)
    except EmailNotValidError:
        raise HTTPException(status_code=400, detail="Sorry, this is an invalid email address!")
    send_email(f"Email to Simple Explanations from {email_info.normalized}", message)
    return {"detail": "Message sent successfully"}


@app.get("/all_categories/", response_model=List[CategoryOut])
@limiter.limit("20/minute")
async def read_category(request: Request, db: dp_dependency):
    await verify_origin(request)
    db_categories = (db.query(models.Category, func.count(models.Sheet.id).label("sheet_count")).outerjoin(models.Sheet, (models.Sheet.category_id == models.Category.id) & (models.Sheet.approved == True)).options(selectinload(models.Category.tags)).group_by(models.Category.id).order_by(func.count(models.Sheet.id).desc()).all())
    for category, sheet_count in db_categories:
        category.sheet_count = sheet_count
    return [category for category, _ in db_categories]


@app.get("/category/{category_id}/", response_model=List[CategorySpecificOut])
@limiter.limit("20/minute")
async def read_category_specific(category_id: int, request: Request, db: dp_dependency):
    await verify_origin(request)
    db_category = db.query(models.Category).options(selectinload(models.Category.tags)).filter(models.Category.id == category_id).first()
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")
    sheets = db.query(models.Sheet).filter(models.Sheet.category_id == category_id, models.Sheet.approved == True).order_by(models.Sheet.views.desc()).all()
    db_category.sheets = sheets
    return [CategorySpecificOut.from_orm(db_category)]


@app.get("/pdf/{pdf_id}/", response_model=SheetDetailOut)
@limiter.limit("20/minute")
async def read_pdf(pdf_id: int, request: Request, db: dp_dependency, csrf_protect: CsrfProtect = Depends(CsrfProtect)):
    await verify(csrf_protect, request)
    await verify_origin(request)
    sheet = (db.query(models.Sheet).options(selectinload(models.Sheet.category_rel).selectinload(models.Category.tags)).filter(models.Sheet.id == pdf_id).first())
    if not sheet:
        raise HTTPException(status_code=404, detail="Sheet not found")
    if not sheet.approved:
        raise HTTPException(status_code=403, detail="Sheet not approved")
    db.execute(update(models.Sheet).where(models.Sheet.id == pdf_id).values(views=models.Sheet.views + 1))
    db.commit()
    return SheetDetailOut.from_orm(sheet)


@app.post("/sheets/")
@limiter.limit("3/min")
@limiter.limit("20/hour")
async def upload_sheet(request: Request, db: dp_dependency, title: str = Form(...), description: str = Form(...), author: str = Form(...), category_id: int = Form(...), file: UploadFile = File(...), csrf_protect: CsrfProtect = Depends(CsrfProtect), recaptcha_response: str = Form(...)):
    await verify(csrf_protect, request)
    await verify_origin(request)
    if not await verify_recaptcha(recaptcha_response):
        raise HTTPException(status_code=400, detail="Invalid reCAPTCHA. Please try again.")
    twenty_four_hours_ago = datetime.utcnow() - timedelta(hours=24)
    unapproved_count = db.query(func.count(models.Sheet.id)).filter(models.Sheet.approved == False, models.Sheet.uploaded_date >= twenty_four_hours_ago).scalar()
    if unapproved_count > 200:
        raise HTTPException(status_code=429, detail="We have reached the limit of unapproved sheets! Please wait for approval before uploading more.")
    title, description, author = [sanitize_text_field(f) for f in [title, description, author]]
    if len(title) > 100 or len(description) > 280 or len(author) > 70:
        raise HTTPException(status_code=400, detail="Title, description, or author exceeds maximum length.")
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")
    file_contents = await file.read()
    if len(file_contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds 10MB limit.")
    mime_type = magic.from_buffer(file_contents, mime=True)
    if mime_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Invalid file type. Only PDFs are allowed.")
    if not (file_contents.startswith(b"%PDF-") and b"%%EOF" in file_contents[-20:]):
        raise HTTPException(status_code=400, detail="Invalid PDF structure.")
    file.file.seek(0)
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = os.path.join(tmpdir, "upload.safe.pdf")
        with open(tmp_path, "wb") as tmp:
            shutil.copyfileobj(file.file, tmp)
        file.file.close()
        try:
            with pikepdf.open(tmp_path) as pdf_check:
                num_pages = len(pdf_check.pages)
                num_objects = len(pdf_check.objects)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid or corrupted PDF.")
        if num_pages > 500:
            raise HTTPException(status_code=400, detail="PDF has too many pages. Max is 500.")
        if num_objects > 50000:
            raise HTTPException(status_code=400, detail="PDF too complex. Max is 50000.")
        try:
            with pikepdf.open(tmp_path, allow_overwriting_input=True) as pdf:
                pdf.remove_unreferenced_resources()
                dangerous_keys = ["/Names", "/JavaScript", "/OpenAction", "/AA", "/AcroForm", "/EmbeddedFiles", "/Metadata", "/Annots", "/RichMedia", "/OCProperties"]
                for key in dangerous_keys:
                    if key in pdf.Root:
                        del pdf.Root[key]
                del pdf.docinfo
                pdf.save(tmp_path)
        except:
            raise HTTPException(status_code=400, detail="Failed to sanitize PDF.")
        try:
            result = cloudinary.uploader.upload(tmp_path, public_id=f"{sanitize_text_field(title, full=False)}_{''.join(random.choices(string.ascii_letters + string.digits, k=6))}")
            cloudinary_url = result["secure_url"]
        except:
            raise HTTPException(status_code=500, detail="Failed to upload PDF to Cloudinary.")
        db_sheet = models.Sheet(title=nh3.clean(title, tags={""}), description=nh3.clean(description, tags={""}), author=nh3.clean(author, tags={""}), url=cloudinary_url, uploaded_date=datetime.utcnow(), category_id=category_id)
        db.add(db_sheet)
        db.commit()
        db.refresh(db_sheet)
    return db_sheet
