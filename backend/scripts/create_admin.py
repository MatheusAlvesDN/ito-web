"""Cria uma conta de admin do painel.

Uso (de qualquer pasta):
    backend/.venv/bin/python backend/scripts/create_admin.py <usuario>
    echo "senha-forte" | backend/.venv/bin/python backend/scripts/create_admin.py <usuario> --password-stdin
    ... --reset-password   troca a senha (e reativa) de um admin existente
"""
import argparse
import getpass
import os
import sys

# Adiciona o diretório backend ao PYTHONPATH
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pydantic import ValidationError

from app.core.database import SessionLocal
from app.core.migrations import run_migrations
from app.core.security import hash_password
from app.models.admin import AdminSession, AdminUser
from app.schemas.admin import AdminCreate


def read_password(from_stdin: bool) -> str:
    if from_stdin:
        return sys.stdin.readline().rstrip("\r\n")
    password = getpass.getpass("Senha: ")
    if password != getpass.getpass("Repita a senha: "):
        sys.exit("Erro: as senhas não conferem.")
    return password


def main() -> None:
    parser = argparse.ArgumentParser(description="Cria uma conta de admin do painel.")
    parser.add_argument("username")
    parser.add_argument("--password-stdin", action="store_true", help="lê a senha da entrada padrão (automação)")
    parser.add_argument("--reset-password", action="store_true", help="troca a senha de um admin existente")
    args = parser.parse_args()

    run_migrations()

    try:
        data = AdminCreate(username=args.username, password=read_password(args.password_stdin))
    except ValidationError as e:
        problems = {err["loc"][0]: err for err in e.errors()}
        if "username" in problems:
            sys.exit("Erro: usuário deve ter de 3 a 50 caracteres (letras, números, '.', '_' ou '-').")
        sys.exit("Erro: a senha deve ter de 8 a 128 caracteres.")

    username = data.username.lower()
    db = SessionLocal()
    try:
        admin = db.query(AdminUser).filter(AdminUser.username == username).first()
        if admin and not args.reset_password:
            sys.exit(f"Erro: o admin '{username}' já existe. Use --reset-password para trocar a senha.")
        if admin is None and args.reset_password:
            sys.exit(f"Erro: o admin '{username}' não existe.")

        if admin:
            admin.password_hash = hash_password(data.password)
            admin.is_active = True
            db.query(AdminSession).filter(AdminSession.admin_id == admin.id).delete(synchronize_session=False)
            message = f"Senha do admin '{username}' atualizada."
        else:
            db.add(AdminUser(username=username, password_hash=hash_password(data.password), is_active=True))
            message = f"Admin '{username}' criado. Entre em /admin com esse usuário."
        db.commit()
        print(message)
    finally:
        db.close()


if __name__ == "__main__":
    main()
