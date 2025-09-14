from pydantic import BaseModel, EmailStr
from typing import List


class CategorySheetBase(BaseModel):
    id: int
    model_config = {"from_attributes": True}


class SheetBase(BaseModel):
    id: int
    title: str
    description: str
    author: str
    url: str
    category_rel: CategorySheetBase
    model_config = {"from_attributes": True}


class SheetDetailOut(BaseModel):
    id: int
    title: str
    description: str
    author: str
    url: str
    category_name: str
    category_rel: CategorySheetBase
    model_config = {"from_attributes": True}


class TagOut(BaseModel):
    name: str
    model_config = {"from_attributes": True}


class CategoryOut(BaseModel):
    id: int
    name: str
    sheet_count: int
    tags: List[TagOut]
    model_config = {"from_attributes": True}


class CategorySpecificOut(BaseModel):
    id: int
    name: str
    description: str
    sheets: List[SheetBase]
    model_config = {"from_attributes": True}
