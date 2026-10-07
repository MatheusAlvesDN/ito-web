from typing import Optional, List, Any
from pydantic import BaseModel

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

    class Config:
        from_attributes = True

class GameOut(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    icon: str
    themes: List[ThemeOut] = []

    class Config:
        from_attributes = True

class ImpostorScenarioOut(BaseModel):
    id: int
    honest: str
    impostor_variations: List[str]

    class Config:
        from_attributes = True

class WhoAmIPersonalityOut(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True

class QuestionOut(BaseModel):
    id: int
    content: str

    class Config:
        from_attributes = True

class GameContentOut(BaseModel):
    game_id: str
    theme_id: str
    questions: Optional[List[str]] = None
    scenarios: Optional[List[dict]] = None
    personalities: Optional[List[str]] = None
