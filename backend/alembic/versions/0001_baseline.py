"""baseline: schema criado pelo antigo create_all

Revision ID: 0001
Revises:
Create Date: 2026-10-28
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "games",
        sa.Column("id", sa.String(50), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("icon", sa.String(50), nullable=True),
    )
    op.create_table(
        "themes",
        sa.Column("id", sa.String(50), primary_key=True),
        sa.Column("original_theme_id", sa.String(50), nullable=False),
        sa.Column("game_id", sa.String(50), sa.ForeignKey("games.id"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("color", sa.String(50), nullable=True),
        sa.Column("text_color", sa.String(50), nullable=True),
        sa.Column("button_color", sa.String(100), nullable=True),
        sa.Column("icon", sa.String(50), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=True),
    )
    op.create_table(
        "questions",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("theme_id", sa.String(50), sa.ForeignKey("themes.id"), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
    )
    op.create_table(
        "impostor_scenarios",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("theme_id", sa.String(50), sa.ForeignKey("themes.id"), nullable=False),
        sa.Column("honest", sa.String(255), nullable=False),
        sa.Column("impostor_variations", sa.JSON(), nullable=False),
    )
    op.create_table(
        "whoami_personalities",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("theme_id", sa.String(50), sa.ForeignKey("themes.id"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("whoami_personalities")
    op.drop_table("impostor_scenarios")
    op.drop_table("questions")
    op.drop_table("themes")
    op.drop_table("games")
