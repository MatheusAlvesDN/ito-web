import re
import unicodedata
from typing import Any, Optional

from fastapi import HTTPException, status
from pydantic import BaseModel, ValidationError
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core import security
from app.models.admin import AdminSession, AdminUser, utcnow
from app.models.game import Game, Theme, Question, ImpostorScenario, WhoAmIPersonality
from app.schemas import admin as schemas
from app.services.game_service import GameService

# Tipo de conteúdo de cada jogo (jogos fora daqui, como o tradutor, não têm itens)
ITEM_TYPE_BY_GAME: dict[str, str] = {
    "classic": "questions",
    "whatdoyouknow": "questions",
    "impostor": "scenarios",
    "whoami": "personalities",
}

ITEM_MODELS = {
    "questions": Question,
    "scenarios": ImpostorScenario,
    "personalities": WhoAmIPersonality,
}

# (schema de criação, schema de edição, schema de saída, coluna principal)
ITEM_SCHEMAS = {
    "questions": (schemas.QuestionIn, schemas.QuestionPatch, schemas.QuestionAdminOut, "content"),
    "scenarios": (schemas.ScenarioIn, schemas.ScenarioPatch, schemas.ScenarioAdminOut, "honest"),
    "personalities": (schemas.PersonalityIn, schemas.PersonalityPatch, schemas.PersonalityAdminOut, "name"),
}

THEME_ID_MAX = 50
MAX_IMPOSTOR_VARIATIONS = 20
IMPOSTOR_LINE_HELP = "Formato esperado: honesta | variação1; variação2"


def _error(code: int, message: str) -> HTTPException:
    return HTTPException(status_code=code, detail=message)


def _validate(model: type[BaseModel], data: Any) -> BaseModel:
    # Erros de validação no mesmo formato 422 do FastAPI
    try:
        return model.model_validate(data)
    except ValidationError as e:
        raise HTTPException(
            status_code=422,
            detail=e.errors(include_url=False, include_context=False),
        )


def slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", "_", text.lower()).strip("_") or "tema"


def _dedup_key(text: str) -> str:
    return " ".join(text.split()).casefold()


class AdminService:
    # --- Autenticação ---

    @staticmethod
    def authenticate(db: Session, username: str, password: str) -> Optional[AdminUser]:
        admin = db.query(AdminUser).filter(AdminUser.username == username.strip().lower()).first()
        # Sempre calcula um hash: o tempo de resposta não revela se o usuário existe
        stored = admin.password_hash if admin else security.DUMMY_PASSWORD_HASH
        valid = security.verify_password(password, stored)
        if admin is None or not admin.is_active or not valid:
            return None
        return admin

    @staticmethod
    def create_session(db: Session, admin: AdminUser) -> str:
        now = utcnow()
        # Aproveita para limpar sessões vencidas
        db.query(AdminSession).filter(AdminSession.expires_at <= now).delete(synchronize_session=False)
        token = security.new_session_token()
        db.add(AdminSession(
            token_hash=security.hash_token(token),
            admin_id=admin.id,
            created_at=now,
            expires_at=security.session_expiry(now),
        ))
        db.commit()
        return token

    @staticmethod
    def get_valid_session(db: Session, token: str) -> Optional[AdminSession]:
        session = db.query(AdminSession).filter(AdminSession.token_hash == security.hash_token(token)).first()
        if session is None:
            return None
        if session.expires_at <= utcnow():
            db.delete(session)
            db.commit()
            return None
        if not session.admin.is_active:
            return None
        return session

    @staticmethod
    def delete_session(db: Session, session_id: int) -> None:
        db.query(AdminSession).filter(AdminSession.id == session_id).delete(synchronize_session=False)
        db.commit()

    # --- Admins ---

    @staticmethod
    def list_admins(db: Session) -> list[AdminUser]:
        return db.query(AdminUser).order_by(AdminUser.id).all()

    @staticmethod
    def create_admin(db: Session, data: schemas.AdminCreate) -> AdminUser:
        username = data.username.lower()
        if db.query(AdminUser).filter(AdminUser.username == username).first():
            raise _error(status.HTTP_409_CONFLICT, "Já existe um admin com esse usuário.")
        admin = AdminUser(username=username, password_hash=security.hash_password(data.password), is_active=True)
        db.add(admin)
        db.commit()
        db.refresh(admin)
        return admin

    @staticmethod
    def update_admin(
        db: Session, admin_id: int, data: schemas.AdminUpdate, current: AdminUser, current_session_id: Optional[int]
    ) -> AdminUser:
        admin = db.get(AdminUser, admin_id)
        if admin is None:
            raise _error(status.HTTP_404_NOT_FOUND, "Admin não encontrado.")

        if data.is_active is False and admin.is_active:
            if admin.id == current.id:
                raise _error(status.HTTP_400_BAD_REQUEST, "Você não pode desativar a própria conta.")
            active = db.query(func.count(AdminUser.id)).filter(AdminUser.is_active.is_(True)).scalar()
            if active <= 1:
                raise _error(status.HTTP_400_BAD_REQUEST, "É preciso manter pelo menos um admin ativo.")
            admin.is_active = False
            # Derruba as sessões de quem foi desativado
            db.query(AdminSession).filter(AdminSession.admin_id == admin.id).delete(synchronize_session=False)
        elif data.is_active is True:
            admin.is_active = True

        if data.password is not None:
            admin.password_hash = security.hash_password(data.password)
            # Troca de senha encerra as outras sessões (mantém a atual se for a própria conta)
            query = db.query(AdminSession).filter(AdminSession.admin_id == admin.id)
            if admin.id == current.id and current_session_id is not None:
                query = query.filter(AdminSession.id != current_session_id)
            query.delete(synchronize_session=False)

        db.commit()
        db.refresh(admin)
        return admin

    # --- Jogos ---

    @staticmethod
    def _get_game(db: Session, game_id: str) -> Game:
        game = db.get(Game, game_id)
        if game is None:
            raise _error(status.HTTP_404_NOT_FOUND, "Jogo não encontrado.")
        return game

    @staticmethod
    def _game_out(game: Game, counts: dict[str, tuple[int, int]]) -> schemas.GameAdminOut:
        total, active = counts.get(game.id, (0, 0))
        return schemas.GameAdminOut(
            id=game.id,
            name=game.name,
            description=game.description,
            icon=game.icon,
            is_active=game.is_active,
            item_type=ITEM_TYPE_BY_GAME.get(game.id),
            theme_count=total,
            active_theme_count=active,
        )

    @staticmethod
    def _theme_counts(db: Session) -> dict[str, tuple[int, int]]:
        # game_id -> (total de temas, temas ativos)
        result: dict[str, tuple[int, int]] = {}
        for game_id, is_active, n in db.query(Theme.game_id, Theme.is_active, func.count(Theme.id)).group_by(
            Theme.game_id, Theme.is_active
        ):
            total, active = result.get(game_id, (0, 0))
            result[game_id] = (total + n, active + (n if is_active else 0))
        return result

    @staticmethod
    def list_games(db: Session) -> list[schemas.GameAdminOut]:
        counts = AdminService._theme_counts(db)
        return [AdminService._game_out(g, counts) for g in db.query(Game).order_by(Game.id).all()]

    @staticmethod
    def update_game(db: Session, game_id: str, data: schemas.GameUpdate) -> schemas.GameAdminOut:
        game = AdminService._get_game(db, game_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            if value is None and field != "description":
                continue
            setattr(game, field, value)
        db.commit()
        db.refresh(game)
        return AdminService._game_out(game, AdminService._theme_counts(db))

    # --- Temas ---

    @staticmethod
    def _get_theme(db: Session, theme_id: str) -> Theme:
        theme = db.get(Theme, theme_id)
        if theme is None:
            raise _error(status.HTTP_404_NOT_FOUND, "Tema não encontrado.")
        return theme

    @staticmethod
    def _theme_out(db: Session, theme: Theme) -> schemas.ThemeAdminOut:
        return AdminService._themes_out(db, [theme])[0]

    @staticmethod
    def _themes_out(db: Session, themes: list[Theme]) -> list[schemas.ThemeAdminOut]:
        ids = [t.id for t in themes]
        totals = GameService.count_items_by_theme(db, ids, active_only=False)
        actives = GameService.count_items_by_theme(db, ids, active_only=True)
        return [
            schemas.ThemeAdminOut(
                id=t.id,
                original_theme_id=t.original_theme_id,
                game_id=t.game_id,
                name=t.name,
                description=t.description,
                color=t.color,
                text_color=t.text_color,
                button_color=t.button_color,
                icon=t.icon,
                is_active=bool(t.is_active),
                item_count=totals.get(t.id, 0),
                active_item_count=actives.get(t.id, 0),
            )
            for t in themes
        ]

    @staticmethod
    def get_theme(db: Session, theme_id: str) -> schemas.ThemeAdminOut:
        return AdminService._theme_out(db, AdminService._get_theme(db, theme_id))

    @staticmethod
    def list_themes(db: Session, game_id: str) -> list[schemas.ThemeAdminOut]:
        AdminService._get_game(db, game_id)
        themes = db.query(Theme).filter(Theme.game_id == game_id).order_by(Theme.name).all()
        return AdminService._themes_out(db, themes)

    @staticmethod
    def create_theme(db: Session, game_id: str, data: schemas.ThemeCreate) -> schemas.ThemeAdminOut:
        AdminService._get_game(db, game_id)
        prefix = f"{game_id}_"
        base = slugify(data.name)[: THEME_ID_MAX - len(prefix) - 4]
        slug, n = base, 2
        while db.get(Theme, prefix + slug) is not None:
            slug = f"{base}_{n}"
            n += 1
        values = data.model_dump(exclude_none=True)
        theme = Theme(id=prefix + slug, original_theme_id=slug, game_id=game_id, **values)
        db.add(theme)
        db.commit()
        db.refresh(theme)
        return AdminService._theme_out(db, theme)

    @staticmethod
    def update_theme(db: Session, theme_id: str, data: schemas.ThemeUpdate) -> schemas.ThemeAdminOut:
        theme = AdminService._get_theme(db, theme_id)
        nullable = {"description", "button_color"}
        for field, value in data.model_dump(exclude_unset=True).items():
            if value is None and field not in nullable:
                continue
            setattr(theme, field, value)
        db.commit()
        db.refresh(theme)
        return AdminService._theme_out(db, theme)

    @staticmethod
    def delete_theme(db: Session, theme_id: str) -> None:
        theme = AdminService._get_theme(db, theme_id)
        db.delete(theme)  # cascade apaga os itens
        db.commit()

    # --- Conteúdo ---

    @staticmethod
    def item_type_for_theme(theme: Theme) -> str:
        item_type = ITEM_TYPE_BY_GAME.get(theme.game_id)
        if item_type is None:
            raise _error(status.HTTP_400_BAD_REQUEST, "Este jogo não tem conteúdo editável.")
        return item_type

    @staticmethod
    def _item_out(item_type: str, item) -> BaseModel:
        return ITEM_SCHEMAS[item_type][2].model_validate(item)

    @staticmethod
    def list_items(
        db: Session, theme_id: str, search: Optional[str], offset: int, limit: int
    ) -> schemas.ItemPage:
        theme = AdminService._get_theme(db, theme_id)
        item_type = AdminService.item_type_for_theme(theme)
        model = ITEM_MODELS[item_type]
        column = getattr(model, ITEM_SCHEMAS[item_type][3])

        query = db.query(model).filter(model.theme_id == theme.id)
        if search and search.strip():
            term = search.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
            query = query.filter(column.ilike(f"%{term}%", escape="\\"))
        total = query.count()
        items = query.order_by(model.id).offset(offset).limit(limit).all()
        return schemas.ItemPage(
            type=item_type,
            total=total,
            offset=offset,
            limit=limit,
            items=[AdminService._item_out(item_type, i) for i in items],
        )

    @staticmethod
    def create_item(db: Session, theme_id: str, body: dict[str, Any]) -> BaseModel:
        theme = AdminService._get_theme(db, theme_id)
        item_type = AdminService.item_type_for_theme(theme)
        data = _validate(ITEM_SCHEMAS[item_type][0], body)
        item = ITEM_MODELS[item_type](theme_id=theme.id, **data.model_dump())
        db.add(item)
        db.commit()
        db.refresh(item)
        return AdminService._item_out(item_type, item)

    @staticmethod
    def _get_item(db: Session, item_type: str, item_id: int):
        item = db.get(ITEM_MODELS[item_type], item_id)
        if item is None:
            raise _error(status.HTTP_404_NOT_FOUND, "Item não encontrado.")
        return item

    @staticmethod
    def update_item(db: Session, item_type: str, item_id: int, body: dict[str, Any]) -> BaseModel:
        item = AdminService._get_item(db, item_type, item_id)
        data = _validate(ITEM_SCHEMAS[item_type][1], body)
        for field, value in data.model_dump(exclude_unset=True).items():
            if value is not None:
                setattr(item, field, value)
        db.commit()
        db.refresh(item)
        return AdminService._item_out(item_type, item)

    @staticmethod
    def delete_item(db: Session, item_type: str, item_id: int) -> None:
        item = AdminService._get_item(db, item_type, item_id)
        db.delete(item)
        db.commit()

    @staticmethod
    def _parse_line(item_type: str, line: str) -> tuple[Optional[dict], Optional[str]]:
        """Converte uma linha em campos do item. Devolve (dados, erro)."""
        if item_type == "questions":
            if len(line) > 500:
                return None, "Texto muito longo (máx. 500 caracteres)."
            return {"content": line}, None
        if item_type == "personalities":
            if len(line) > 255:
                return None, "Nome muito longo (máx. 255 caracteres)."
            return {"name": line}, None
        # Impostor: "honesta | variação1; variação2"
        honest, sep, rest = line.partition("|")
        honest = honest.strip()
        variations = [v.strip() for v in rest.split(";") if v.strip()]
        if not sep or not honest or not variations:
            return None, IMPOSTOR_LINE_HELP
        if len(honest) > 255 or any(len(v) > 255 for v in variations):
            return None, "Texto muito longo (máx. 255 caracteres por pergunta)."
        if len(variations) > MAX_IMPOSTOR_VARIATIONS:
            return None, f"No máximo {MAX_IMPOSTOR_VARIATIONS} variações por linha."
        return {"honest": honest, "impostor_variations": variations}, None

    @staticmethod
    def bulk_import(db: Session, theme_id: str, lines: list[str]) -> schemas.BulkImportOut:
        theme = AdminService._get_theme(db, theme_id)
        item_type = AdminService.item_type_for_theme(theme)
        model = ITEM_MODELS[item_type]
        key_field = ITEM_SCHEMAS[item_type][3]

        # Duplicatas: compara com o que já existe no tema (ativo ou não) e com o próprio lote
        seen = {
            _dedup_key(v)
            for (v,) in db.query(getattr(model, key_field)).filter(model.theme_id == theme.id)
        }
        result = schemas.BulkImportOut(type=item_type, created=0, skipped_blank=0, skipped_duplicate=0, invalid=[])
        for number, raw in enumerate(lines, start=1):
            line = raw.strip()
            if not line:
                result.skipped_blank += 1
                continue
            data, error = AdminService._parse_line(item_type, line)
            if error:
                result.invalid.append(schemas.BulkLineError(line=number, error=error))
                continue
            key = _dedup_key(data[key_field])
            if key in seen:
                result.skipped_duplicate += 1
                continue
            seen.add(key)
            db.add(model(theme_id=theme.id, is_active=True, **data))
            result.created += 1
        db.commit()
        return result
