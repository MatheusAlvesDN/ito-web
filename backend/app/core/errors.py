"""Mensagens de validação (422) em português, mantendo o formato padrão do FastAPI."""
from fastapi import Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

FIELD_NAMES = {
    "username": "usuário",
    "password": "senha",
    "name": "nome",
    "description": "descrição",
    "icon": "ícone",
    "content": "texto",
    "honest": "palavra dos honestos",
    "impostor_variations": "variações do impostor",
    "lines": "linhas",
}


def _translate(error: dict) -> str:
    loc = [str(part) for part in error.get("loc", ()) if part not in ("body", "query", "path")]
    field = FIELD_NAMES.get(loc[-1], loc[-1]) if loc else "campo"
    ctx = error.get("ctx") or {}
    kind = error.get("type", "")

    if kind == "missing":
        return f"O campo {field} é obrigatório."
    if kind == "string_too_short":
        return f"O campo {field} precisa ter pelo menos {ctx.get('min_length')} caractere(s)."
    if kind == "string_too_long":
        return f"O campo {field} pode ter no máximo {ctx.get('max_length')} caracteres."
    if kind == "too_short":
        return f"O campo {field} precisa ter pelo menos {ctx.get('min_length')} item(ns)."
    if kind == "too_long":
        return f"O campo {field} pode ter no máximo {ctx.get('max_length')} itens."
    if kind in ("greater_than_equal", "greater_than"):
        return f"O campo {field} precisa ser no mínimo {ctx.get('ge', ctx.get('gt'))}."
    if kind in ("less_than_equal", "less_than"):
        return f"O campo {field} pode ser no máximo {ctx.get('le', ctx.get('lt'))}."
    if kind.endswith("_type") or kind.endswith("_parsing"):
        return f"O campo {field} tem um valor inválido."
    if kind == "extra_forbidden":
        return f"O campo {field} não é permitido."
    return f"O campo {field} é inválido."


async def validation_exception_handler(_request: Request, exc: RequestValidationError) -> JSONResponse:
    errors = [{**error, "msg": _translate(error)} for error in exc.errors()]
    return JSONResponse(status_code=422, content={"detail": jsonable_encoder(errors)})
