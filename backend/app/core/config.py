import os
from typing import List, Union
from pydantic_settings import BaseSettings
from pydantic import field_validator

class Settings(BaseSettings):
    PROJECT_NAME: str = "TRACE — AI-Powered Collective Intelligence"
    API_V1_STR: str = "/api"
    DATABASE_URL: str = "sqlite:///./trace.db"
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = "trace_demo_jwt_secret_for_local_verification_key_32_bytes"
    AI_API_KEY: str = ""
    MAPBOX_TOKEN: str = ""
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001"
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"

settings = Settings()
