from datetime import datetime, timezone
from typing import Annotated, Optional, List, Literal, Union
from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_serializer

# Tipos de item de conteúdo, definidos pelo jogo do tema
ItemType = Literal["questions", "scenarios", "personalities"]

USERNAME_PATTERN = r"^[A-Za-z0-9_.-]+$"


class _In(BaseModel):
    # Entradas: tira espaços das pontas e recusa campos desconhecidos
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")


# --- Autenticação / admins ---

class LoginIn(_In):
    username: str = Field(min_length=1, max_length=50)
    password: str = Field(min_length=1, max_length=128)


class AdminOut(BaseModel):
    id: int
    username: str

    model_config = ConfigDict(from_attributes=True)


class AdminDetailOut(AdminOut):
    is_active: bool
    created_at: datetime

    # O banco guarda UTC sem fuso; envia com fuso para o navegador converter certo
    @field_serializer("created_at")
    def _utc(self, value: datetime) -> str:
        return (value if value.tzinfo else value.replace(tzinfo=timezone.utc)).isoformat()


class LoginOut(BaseModel):
    token: str
    admin: AdminOut


class AdminCreate(_In):
    username: str = Field(min_length=3, max_length=50, pattern=USERNAME_PATTERN)
    password: str = Field(min_length=8, max_length=128)


class AdminUpdate(_In):
    is_active: Optional[bool] = None
    password: Optional[str] = Field(default=None, min_length=8, max_length=128)


# --- Jogos e temas ---

class GameAdminOut(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    is_active: bool
    item_type: Optional[ItemType] = None  # None = jogo sem conteúdo (ex.: tradutor)
    theme_count: int = 0
    active_theme_count: int = 0


class GameUpdate(_In):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=500)
    icon: Optional[str] = Field(default=None, min_length=1, max_length=50)
    is_active: Optional[bool] = None


class ThemeAdminOut(BaseModel):
    id: str
    original_theme_id: str
    game_id: str
    name: str
    description: Optional[str] = None
    color: Optional[str] = None
    text_color: Optional[str] = None
    button_color: Optional[str] = None
    icon: Optional[str] = None
    is_active: bool
    item_count: int = 0
    active_item_count: int = 0


class ThemeCreate(_In):
    name: str = Field(min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=500)
    icon: str = Field(default="Star", min_length=1, max_length=50)
    color: Optional[str] = Field(default=None, max_length=50)
    text_color: Optional[str] = Field(default=None, max_length=50)
    button_color: Optional[str] = Field(default=None, max_length=100)
    is_active: bool = True


class ThemeUpdate(_In):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=500)
    icon: Optional[str] = Field(default=None, min_length=1, max_length=50)
    color: Optional[str] = Field(default=None, max_length=50)
    text_color: Optional[str] = Field(default=None, max_length=50)
    button_color: Optional[str] = Field(default=None, max_length=100)
    is_active: Optional[bool] = None


# --- Conteúdo (itens de um tema) ---

class QuestionIn(_In):
    content: str = Field(min_length=1, max_length=500)
    is_active: bool = True


class QuestionPatch(_In):
    content: Optional[str] = Field(default=None, min_length=1, max_length=500)
    is_active: Optional[bool] = None


Variation = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)]


class ScenarioIn(_In):
    honest: str = Field(min_length=1, max_length=255)
    impostor_variations: List[Variation] = Field(min_length=1, max_length=20)
    is_active: bool = True


class ScenarioPatch(_In):
    honest: Optional[str] = Field(default=None, min_length=1, max_length=255)
    impostor_variations: Optional[List[Variation]] = Field(default=None, min_length=1, max_length=20)
    is_active: Optional[bool] = None


class PersonalityIn(_In):
    name: str = Field(min_length=1, max_length=255)
    is_active: bool = True


class PersonalityPatch(_In):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    is_active: Optional[bool] = None


class QuestionAdminOut(BaseModel):
    id: int
    theme_id: str
    content: str
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class ScenarioAdminOut(BaseModel):
    id: int
    theme_id: str
    honest: str
    impostor_variations: List[str]
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class PersonalityAdminOut(BaseModel):
    id: int
    theme_id: str
    name: str
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


ItemOut = Union[QuestionAdminOut, ScenarioAdminOut, PersonalityAdminOut]


class ItemPage(BaseModel):
    type: ItemType
    total: int
    offset: int
    limit: int
    items: List[ItemOut]


class BulkImportIn(_In):
    lines: List[str] = Field(max_length=5000)


class BulkLineError(BaseModel):
    line: int  # 1-based
    error: str


class BulkImportOut(BaseModel):
    type: ItemType
    created: int
    skipped_blank: int
    skipped_duplicate: int
    invalid: List[BulkLineError] = []
