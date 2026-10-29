"""admin (usuários e sessões), is_active em jogos e itens, índices por tema

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-28
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

ITEM_TABLES = ("questions", "impostor_scenarios", "whoami_personalities")


def upgrade() -> None:
    # Tolerante a bancos em que o antigo create_all já criou parte disto
    inspector = sa.inspect(op.get_bind())
    tables = set(inspector.get_table_names())

    def columns(table: str) -> set[str]:
        return {c["name"] for c in inspector.get_columns(table)}

    def indexes(table: str) -> set[str]:
        return {i["name"] for i in inspector.get_indexes(table)}

    if "is_active" not in columns("games"):
        with op.batch_alter_table("games") as batch:
            batch.add_column(sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("1")))

    for table in ITEM_TABLES:
        has_active = "is_active" in columns(table)
        has_index = f"ix_{table}_theme_id" in indexes(table)
        if has_active and has_index:
            continue
        with op.batch_alter_table(table) as batch:
            if not has_active:
                batch.add_column(sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("1")))
            if not has_index:
                batch.create_index(f"ix_{table}_theme_id", ["theme_id"])

    if "admin_users" not in tables:
        op.create_table(
            "admin_users",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("username", sa.String(50), nullable=False, unique=True),
            sa.Column("password_hash", sa.String(255), nullable=False),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("1")),
            sa.Column("created_at", sa.DateTime(), nullable=False),
        )
    if "admin_sessions" not in tables:
        op.create_table(
            "admin_sessions",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("token_hash", sa.String(64), nullable=False, unique=True),
            sa.Column("admin_id", sa.Integer(), sa.ForeignKey("admin_users.id"), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("expires_at", sa.DateTime(), nullable=False),
        )
    if "ix_admin_sessions_admin_id" not in (indexes("admin_sessions") if "admin_sessions" in tables else set()):
        op.create_index("ix_admin_sessions_admin_id", "admin_sessions", ["admin_id"])


def downgrade() -> None:
    op.drop_index("ix_admin_sessions_admin_id", table_name="admin_sessions")
    op.drop_table("admin_sessions")
    op.drop_table("admin_users")
    for table in ITEM_TABLES:
        with op.batch_alter_table(table) as batch:
            batch.drop_index(f"ix_{table}_theme_id")
            batch.drop_column("is_active")
    with op.batch_alter_table("games") as batch:
        batch.drop_column("is_active")
