from datetime import datetime


def success_response(data=None, message="Success"):
    return {
        "success": True,
        "message": message,
        "timestamp": datetime.utcnow(),
        "data": data,
    }


def error_response(code, message, details=None):
    return {
        "success": False,
        "timestamp": datetime.utcnow(),
        "error": {
            "code": code,
            "message": message,
            "details": details,
        },
    }