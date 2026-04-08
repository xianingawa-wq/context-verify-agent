from app.db.models import Base
from app.db.session import get_engine


def ensure_postgres_schema() -> None:
    Base.metadata.create_all(bind=get_engine())
