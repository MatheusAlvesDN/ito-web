import base64
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

# scrypt (stdlib): ~16 MB de memória por hash
SCRYPT_N = 2**14
SCRYPT_R = 8
SCRYPT_P = 1
SALT_BYTES = 16
SESSION_TTL = timedelta(days=7)


def _b64(data: bytes) -> str:
    return base64.b64encode(data).decode("ascii")


def _scrypt(password: str, salt: bytes, n: int, r: int, p: int) -> bytes:
    return hashlib.scrypt(password.encode("utf-8"), salt=salt, n=n, r=r, p=p, maxmem=64 * 1024 * 1024, dklen=32)


def hash_password(password: str) -> str:
    """Formato: scrypt$n$r$p$salt_b64$hash_b64"""
    salt = secrets.token_bytes(SALT_BYTES)
    digest = _scrypt(password, salt, SCRYPT_N, SCRYPT_R, SCRYPT_P)
    return f"scrypt${SCRYPT_N}${SCRYPT_R}${SCRYPT_P}${_b64(salt)}${_b64(digest)}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algo, n, r, p, salt_b64, hash_b64 = stored.split("$")
        if algo != "scrypt":
            return False
        expected = base64.b64decode(hash_b64)
        digest = _scrypt(password, base64.b64decode(salt_b64), int(n), int(r), int(p))
    except (ValueError, TypeError):
        return False
    return hmac.compare_digest(digest, expected)


# Hash descartável: usado quando o usuário não existe, para o login levar o mesmo tempo
DUMMY_PASSWORD_HASH = hash_password(secrets.token_urlsafe(16))


def new_session_token() -> str:
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    # Só o sha256 do token vai para o banco
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def session_expiry(now: datetime | None = None) -> datetime:
    now = now or datetime.now(timezone.utc).replace(tzinfo=None)
    return now + SESSION_TTL
