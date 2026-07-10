from typing import Dict, Optional
from uuid import uuid4


class UserRepository:

    def __init__(self):
        self.users: Dict[str, dict] = {}

    def create_user(self, user_data: dict):

        user_id = str(uuid4())

        user_data["id"] = user_id

        self.users[user_data["email"]] = user_data

        return user_data

    def get_user_by_email(self, email: str):

        return self.users.get(email)

    def get_user_by_id(self, user_id: str):

        for user in self.users.values():

            if user["id"] == user_id:

                return user

        return None

    def update_user(self, email: str, updated_data: dict):

        if email not in self.users:

            return None

        self.users[email].update(updated_data)

        return self.users[email]

    def delete_user(self, email: str):

        return self.users.pop(email, None)

    def list_users(self):

        return list(self.users.values())


user_repository = UserRepository()