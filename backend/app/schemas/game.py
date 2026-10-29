from typing import Optional, List, Any
from pydantic import BaseModel, ConfigDict

class ThemeOut(BaseModel):
    id: str
    original_theme_id: str
    game_id: str
    name: str
    description: Optional[str] = None
    color: str
    text_color: str
    button_color: Optional[str] = None
    icon: str
    is_active: bool
    item_count: int = 0  # itens ativos do tema

    model_config = ConfigDict(from_attributes=True)

class GameOut(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    icon: str
    themes: List[ThemeOut] = []

    model_config = ConfigDict(from_attributes=True)

class ImpostorScenarioOut(BaseModel):
    id: int
    honest: str
    impostor_variations: List[str]

    model_config = ConfigDict(from_attributes=True)

class WhoAmIPersonalityOut(BaseModel):
    id: int
    name: str

    model_config = ConfigDict(from_attributes=True)

class QuestionOut(BaseModel):
    id: int
    content: str

    model_config = ConfigDict(from_attributes=True)
