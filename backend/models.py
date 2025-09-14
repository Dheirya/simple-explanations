from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Table
from sqlalchemy.orm import relationship
from sqlalchemy import DateTime
from datetime import datetime
from database import Base

category_tag_association = Table('category_tag_association', Base.metadata, Column('category_id', Integer, ForeignKey('categories.id'), primary_key=True), Column('tag_id', Integer, ForeignKey('tags.id'), primary_key=True))


class Tag(Base):
    __tablename__ = 'tags'
    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, index=True)
    categories = relationship("Category", secondary=category_tag_association, back_populates="tags")

    def __str__(self):
        return self.name


class Category(Base):
    __tablename__ = 'categories'
    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, index=True)
    description = Column(String, nullable=False)
    sheets = relationship("Sheet", back_populates="category_rel")
    tags = relationship("Tag", secondary=category_tag_association, back_populates="categories")

    def __str__(self):
        return self.name


class Sheet(Base):
    __tablename__ = 'sheets'
    id = Column(Integer, primary_key=True)
    title = Column(String, index=True, nullable=False)
    description = Column(String, index=True, nullable=False)
    author = Column(String, nullable=False)
    url = Column(String, unique=True, nullable=False)
    uploaded_date = Column(DateTime, default=datetime.utcnow)
    approved = Column(Boolean, default=False)
    category_id = Column(Integer, ForeignKey('categories.id'), index=True)
    category_rel = relationship("Category", back_populates="sheets")
    views = Column(Integer, default=0)

    def __str__(self):
        return self.title

    @property
    def category_name(self):
        return self.category_rel.name if self.category_rel else None
