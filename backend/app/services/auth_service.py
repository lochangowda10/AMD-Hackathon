from app.repositories.user_repository import user_repository
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token
)


class AuthService:

    def signup(
        self,
        name: str,
        email: str,
        password: str
    ):

        existing = user_repository.get_user_by_email(email)

        if existing:

            raise ValueError("User already exists")

        hashed = hash_password(password)

        user = {

            "name": name,

            "email": email,

            "password": hashed

        }

        created = user_repository.create_user(user)

        token = create_access_token(

            {"sub": created["email"]}

        )

        return {

            "user": created,

            "access_token": token

        }

    def login(
        self,
        email: str,
        password: str
    ):

        user = user_repository.get_user_by_email(email)

        if not user:

            raise ValueError("Invalid credentials")

        if not verify_password(

            password,

            user["password"]

        ):

            raise ValueError("Invalid credentials")

        token = create_access_token(

            {"sub": user["email"]}

        )

        return {

            "user": user,

            "access_token": token

        }


auth_service = AuthService()