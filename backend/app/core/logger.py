from loguru import logger
import sys

logger.remove()

logger.add(
    sys.stdout,
    level="INFO",
    format="{time:YYYY-MM-DD HH:mm:ss} | {level} | {message}",
)

logger.add(
    "app/logs/backend.log",
    rotation="10 MB",
    retention="7 days",
    level="INFO",
)

app_logger = logger