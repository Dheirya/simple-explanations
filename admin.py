from sqladmin.authentication import AuthenticationBackend
from authlib.integrations.starlette_client import OAuth
from starlette.responses import RedirectResponse
from sqladmin import Admin, ModelView, action
from starlette.responses import Response
from fastapi import Request
import cloudinary.uploader
from typing import Union
import models
import os

EMAIL = os.environ.get("EMAIL")
CLIENT_ID = os.environ.get("CLIENT_ID")
CLIENT_SECRET = os.environ.get("CLIENT_SECRET")
CALLBACK_URL = os.environ.get("CALLBACK_URL")
CLOUDINARY_CLOUD_NAME = os.environ.get("CLOUDINARY_CLOUD_NAME")
CLOUDINARY_API_KEY = os.environ.get("CLOUDINARY_API_KEY")
CLOUDINARY_API_SECRET = os.environ.get("CLOUDINARY_API_SECRET")
cloudinary.config(cloud_name=CLOUDINARY_CLOUD_NAME, api_key=CLOUDINARY_API_KEY, api_secret=CLOUDINARY_API_SECRET, secure=True)
oauth = OAuth()
oauth.register('google', client_id=CLIENT_ID, client_secret=CLIENT_SECRET, server_metadata_url='https://accounts.google.com/.well-known/openid-configuration', client_kwargs={'scope': 'openid email', 'prompt': 'select_account'})
google = oauth.create_client('google')


class AdminAuth(AuthenticationBackend):
    async def logout(self, request: Request) -> bool:
        request.session.clear()
        return True

    async def authenticate(self, request: Request) -> Union[bool, RedirectResponse]:
        user = request.session.get("user")
        if not user:
            redirect_uri = request.url_for('login_google')
            return await google.authorize_redirect(request, redirect_uri)
        email = user.get("email")
        email_verified = user.get("email_verified")
        if email != EMAIL or not email_verified:
            request.session.clear()
            return RedirectResponse("/")
        return True


async def login_google(request: Request) -> Response:
    token = await google.authorize_access_token(request)
    user = token.get('userinfo')
    if user:
        request.session['user'] = user
    return RedirectResponse(request.url_for("admin:index"))


class TagView(ModelView, model=models.Tag):
    column_list = [models.Tag.id, models.Tag.name, models.Tag.categories]
    column_searchable_list = [models.Tag.name]
    form_columns = [models.Tag.name]


class CategoryView(ModelView, model=models.Category):
    column_list = [models.Category.id, models.Category.name, models.Category.description, models.Category.sheets, models.Category.tags]
    column_searchable_list = [models.Category.name, models.Category.description]
    form_columns = [models.Category.name, models.Category.description, models.Category.tags]


class SheetView(ModelView, model=models.Sheet):
    column_list = [models.Sheet.id, models.Sheet.approved, models.Sheet.views, models.Sheet.url, models.Sheet.uploaded_date, models.Sheet.category_rel, models.Sheet.author, models.Sheet.title, models.Sheet.description]
    column_searchable_list = [models.Sheet.title, models.Sheet.author, models.Sheet.description, models.Sheet.url]
    form_columns = [models.Sheet.title, models.Sheet.description, models.Sheet.author, models.Sheet.url, models.Sheet.category_rel, models.Sheet.views]
    can_delete = False
    column_default_sort = (models.Sheet.id, True)
    page_size = 50

    @action(name="delete", label="Delete Sheets", confirmation_message="Are you sure?", add_in_detail=True, add_in_list=True)
    async def delete_sheets(self, request: Request):
        pks = request.query_params.get("pks", "").split(",")
        if not pks or pks[0] == '':
            return RedirectResponse(request.url_for("admin:list", identity=self.identity), status_code=303)
        with self.session_maker() as session:
            for pk in pks:
                model = session.get(models.Sheet, int(pk))
                if model:
                    cloudinary.uploader.destroy(model.url.split("/")[-1].rsplit(".", 1)[0])
                    session.delete(model)
            session.commit()
        return RedirectResponse(request.url_for("admin:list", identity=self.identity), status_code=303)

    @action(name="approve", label="Approve Sheets", confirmation_message="Are you sure?", add_in_detail=True, add_in_list=True)
    async def approve_sheets(self, request: Request):
        pks = request.query_params.get("pks", "").split(",")
        if not pks or pks[0] == '':
            return RedirectResponse(request.url_for("admin:list", identity=self.identity), status_code=303)
        with self.session_maker() as session:
            for pk in pks:
                model = session.get(models.Sheet, int(pk))
                if model:
                    model.approved = True
                    session.add(model)
            session.commit()
        return RedirectResponse(request.url_for("admin:list", identity=self.identity), status_code=303)

    @action(name="unapprove", label="Unapprove Sheets", confirmation_message="Are you sure?", add_in_detail=True, add_in_list=True)
    async def unapprove_sheets(self, request: Request):
        pks = request.query_params.get("pks", "").split(",")
        if not pks or pks[0] == '':
            return RedirectResponse(request.url_for("admin:list", identity=self.identity), status_code=303)
        with self.session_maker() as session:
            for pk in pks:
                model = session.get(models.Sheet, int(pk))
                if model:
                    model.approved = False
                    session.add(model)
            session.commit()
        return RedirectResponse(request.url_for("admin:list", identity=self.identity), status_code=303)