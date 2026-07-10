from app.common.error_codes import ErrorCode


class TradingCopilotException(Exception):
    def __init__(
        self,
        message: str,
        code: ErrorCode,
        status_code: int = 400,
        details=None,
    ):
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details


class MarketDataException(TradingCopilotException):
    def __init__(self, message="Market data unavailable"):
        super().__init__(
            message=message,
            code=ErrorCode.MARKET_DATA_UNAVAILABLE,
            status_code=503,
        )


class FireworksException(TradingCopilotException):
    def __init__(self, message="Fireworks AI unavailable"):
        super().__init__(
            message=message,
            code=ErrorCode.FIREWORKS_ERROR,
            status_code=503,
        )


class AuthenticationException(TradingCopilotException):
    def __init__(self, message="Authentication failed"):
        super().__init__(
            message=message,
            code=ErrorCode.UNAUTHORIZED,
            status_code=401,
        )


class ValidationException(TradingCopilotException):
    def __init__(self, message="Validation failed"):
        super().__init__(
            message=message,
            code=ErrorCode.VALIDATION_ERROR,
            status_code=422,
        )