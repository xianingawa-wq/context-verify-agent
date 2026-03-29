from typing import Literal

from pydantic import BaseModel, Field


Severity = Literal["high", "medium", "low", "info"]


class HealthResponse(BaseModel):
    status: str


class ReviewRequest(BaseModel):
    contract_text: str = Field(..., min_length=1, description="合同全文文本")
    contract_type: str | None = Field(default=None, description="合同类型，例如采购合同")
    our_side: str = Field(default="甲方", description="我方角色，例如甲方/乙方")


class ExtractedFields(BaseModel):
    contract_name: str | None = None
    party_a: str | None = None
    party_b: str | None = None
    amount: str | None = None
    dispute_clause: str | None = None


class RiskItem(BaseModel):
    rule_id: str
    title: str
    severity: Severity
    description: str
    evidence: str
    suggestion: str


class ReviewSummary(BaseModel):
    contract_type: str
    overall_risk: Severity
    risk_count: int


class ReviewResponse(BaseModel):
    summary: ReviewSummary
    extracted_fields: ExtractedFields
    risks: list[RiskItem]
