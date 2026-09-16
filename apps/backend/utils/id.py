import secrets
import string

ALPHANUMERIC = string.ascii_letters + string.digits

def generate_id(prefix: str, length: int = 24) -> str:
    """
    Generates a Stripe-style prefixed ID (e.g. `lnk_2k9x8a7b6c5d4e3f2g1h0i9j`).
    """
    random_str = ''.join(secrets.choice(ALPHANUMERIC) for _ in range(length))
    return f"{prefix}_{random_str}"

def validate_id(id_str: str, expected_prefix: str) -> bool:
    """
    Validates whether an ID matches the expected prefix and length.
    """
    if not id_str or not isinstance(id_str, str):
        return False
    parts = id_str.split('_')
    return len(parts) == 2 and parts[0] == expected_prefix and len(parts[1]) == 24

