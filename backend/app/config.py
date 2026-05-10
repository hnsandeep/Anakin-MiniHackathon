from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(ROOT / ".env"), extra="ignore")

    anakin_api_key: str = ""
    # Gemini Flash — FREE primary AI provider
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"
    # Anthropic Claude — paid secondary AI provider
    anthropic_api_key: str = ""
    analyser_model: str = "claude-sonnet-4-20250514"
    database_url: str = f"sqlite:///{ROOT / 'backend' / 'data' / 'compliance.db'}"

    anakin_base_url: str = "https://api.anakin.io/v1"


settings = Settings()
