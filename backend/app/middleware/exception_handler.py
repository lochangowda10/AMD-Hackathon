from fastapi import Request
from fastapi.responses import JSONResponse

from app.common.exceptions import TradingCopilotException
from app.common.responses import error_response


async def trading_exception_handler(
    request: Request,
    exc: TradingCopilotException,
):
    return JSONResponse(
        status_code=exc.status_code,
        content=error_response(
            code=exc.code,
            message=exc.message,
            details=exc.details,
        ),
    )


async def generic_exception_handler(
    request: Request,
    exc: Exception,
):
    return JSONResponse(
        status_code=500,
        content=error_response(
            code="INTERNAL_SERVER_ERROR",
            message=str(exc),
        ),
    )