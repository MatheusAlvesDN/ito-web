from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, ForeignKey, Boolean, DateTime, text
from sqlalchemy.orm import relationship
from app.core.database import Base


def utcnow() -> datetime:
    # SQLite não guarda fuso: tudo em UTC "ingênuo"
    return datetime.now(timezone.utc).replace(tzinfo=None)


class AdminUser(Base):
    __tablename__ = "admin_users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True, server_default=text("1"))
    created_at = Column(DateTime, nullable=False, default=utcnow)

    sessions = relationship("AdminSession", back_populates="admin", cascade="all, delete-orphan")


class AdminSession(Base):
    __tablename__ = "admin_sessions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    token_hash = Column(String(64), unique=True, nullable=False)  # sha256 do token, nunca o token
    admin_id = Column(Integer, ForeignKey("admin_users.id"), nullable=False, index=True)
    created_at = Column(DateTime, nullable=False, default=utcnow)
    expires_at = Column(DateTime, nullable=False)

    admin = relationship("AdminUser", back_populates="sessions")
