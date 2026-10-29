from sqlalchemy import Column, String, Integer, Text, ForeignKey, Boolean, JSON, text
from sqlalchemy.orm import relationship
from app.core.database import Base

class Game(Base):
    __tablename__ = "games"

    id = Column(String(50), primary_key=True) # 'classic', 'impostor', 'whoami', 'whatdoyouknow', 'translator'
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    icon = Column(String(50), default="Gamepad2")
    is_active = Column(Boolean, nullable=False, default=True, server_default=text("1"))

    themes = relationship("Theme", back_populates="game", cascade="all, delete-orphan")


class Theme(Base):
    __tablename__ = "themes"

    id = Column(String(50), primary_key=True) # ex: 'classic_anime', 'whoami_historico'
    original_theme_id = Column(String(50), nullable=False) # 'anime', 'historico', etc.
    game_id = Column(String(50), ForeignKey("games.id"), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    color = Column(String(50), default="bg-slate-200")
    text_color = Column(String(50), default="text-slate-900")
    button_color = Column(String(100), nullable=True)
    icon = Column(String(50), default="Star")
    is_active = Column(Boolean, default=True)

    game = relationship("Game", back_populates="themes")
    questions = relationship("Question", back_populates="theme", cascade="all, delete-orphan")
    impostor_scenarios = relationship("ImpostorScenario", back_populates="theme", cascade="all, delete-orphan")
    personalities = relationship("WhoAmIPersonality", back_populates="theme", cascade="all, delete-orphan")


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    theme_id = Column(String(50), ForeignKey("themes.id"), nullable=False, index=True)
    content = Column(Text, nullable=False)
    # Desativado = some do jogo sem ser apagado
    is_active = Column(Boolean, nullable=False, default=True, server_default=text("1"))

    theme = relationship("Theme", back_populates="questions")


class ImpostorScenario(Base):
    __tablename__ = "impostor_scenarios"

    id = Column(Integer, primary_key=True, autoincrement=True)
    theme_id = Column(String(50), ForeignKey("themes.id"), nullable=False, index=True)
    honest = Column(String(255), nullable=False)
    impostor_variations = Column(JSON, nullable=False) # List[str]
    is_active = Column(Boolean, nullable=False, default=True, server_default=text("1"))

    theme = relationship("Theme", back_populates="impostor_scenarios")


class WhoAmIPersonality(Base):
    __tablename__ = "whoami_personalities"

    id = Column(Integer, primary_key=True, autoincrement=True)
    theme_id = Column(String(50), ForeignKey("themes.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True, server_default=text("1"))

    theme = relationship("Theme", back_populates="personalities")
