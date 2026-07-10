from app.services.auth_service import auth_service


def test_auth():

    signup = auth_service.signup(

        name="Kanak",

        email="kanak@gmail.com",

        password="AMDHackathon2026"

    )

    print()

    print("Signup")

    print(signup)

    print()

    login = auth_service.login(

        "kanak@gmail.com",

        "AMDHackathon2026"

    )

    print("Login")

    print(login)


if __name__ == "__main__":

    test_auth()