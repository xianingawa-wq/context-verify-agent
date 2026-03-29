from pydantic import BaseModel


class Settings(BaseModel):
    app_name: str = "Contract Review Agent MVP"
    default_contract_type: str = "采购合同"


settings = Settings()
