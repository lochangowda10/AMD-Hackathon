from loguru import logger
import sys

logger.remove()

logger.add(
    sys.stdout,
    level="INFO"
)

logger.add(
    "app/logs/backend.log",
    rotation="5 MB"
)

app_logger = logger