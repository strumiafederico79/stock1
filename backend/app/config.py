from functools import lru_cache
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')

    app_name: str = 'Stock Control Pro'
    api_prefix: str = '/api/v1'
    debug: bool = False
    database_url: str = 'sqlite:///./stock_control.db'
    cors_origins_raw: str = Field(default='http://localhost:5173,http://localhost:4173,http://localhost,http://127.0.0.1:5173')
    barcode_type_default: str = 'CODE128'
    jwt_secret_key: str = 'change-this-secret-key'
    jwt_algorithm: str = 'HS256'
    access_token_expire_minutes: int = 720
    default_admin_username: str = 'admin'
    default_admin_password: str = 'admin1234'
    default_admin_full_name: str = 'Administrador General'

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.cors_origins_raw.split(',') if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
