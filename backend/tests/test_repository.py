from app.repositories.user_repository import user_repository


def test_repository():

    user = {

        "name": "Kanak",

        "email": "kanak@gmail.com"

    }

    created = user_repository.create_user(user)

    print(created)

    fetched = user_repository.get_user_by_email("kanak@gmail.com")

    print(fetched)

    print(user_repository.list_users())


if __name__ == "__main__":

    test_repository()