from sqlmodel import SQLModel, create_engine, Session

import os

# Build paths inside the project like this: os.path.join(BASE_DIR, ...)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Database is now in sibling directory 'database'
sqlite_file_name = os.path.join(BASE_DIR, "..", "database", "database.db")

sqlite_url = "sqlite:////app/data/database.db"


engine = create_engine(sqlite_url, echo=True)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
