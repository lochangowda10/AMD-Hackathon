from app.core.security import (
    hash_password,
    verify_password,
    create_access_token
)


def test_security():

    password = "AMDHackathon2026"

    hashed = hash_password(password)

    print("Hash:")
    print(hashed)

    print()

    print("Password Valid:")

    print(
        verify_password(
            password,
            hashed
        )
    )

    print()

    token = create_access_token(
        {"sub": "kanak@gmail.com"}
    )

    print("JWT:")

    print(token)


if __name__ == "__main__":

    test_security()