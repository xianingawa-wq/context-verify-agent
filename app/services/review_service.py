from app.core.config import settings
from app.schemas.review import ReviewRequest, ReviewResponse, ReviewSummary
from app.services.classifier import ContractClassifier
from app.services.extractor import ContractExtractor
from app.services.rule_engine import RuleEngine


class ReviewService:
    def __init__(self) -> None:
        self.classifier = ContractClassifier()
        self.extractor = ContractExtractor()
        self.rule_engine = RuleEngine()

    def review(self, payload: ReviewRequest) -> ReviewResponse:
        contract_type = payload.contract_type or self.classifier.classify(payload.contract_text)
        extracted_fields = self.extractor.extract(payload.contract_text)
        risks = self.rule_engine.check(contract_type, payload.contract_text)

        return ReviewResponse(
            summary=ReviewSummary(
                contract_type=contract_type or settings.default_contract_type,
                overall_risk=self._overall_risk(risks),
                risk_count=len(risks),
            ),
            extracted_fields=extracted_fields,
            risks=risks,
        )

    def _overall_risk(self, risks: list) -> str:
        severities = {risk.severity for risk in risks}
        if "high" in severities:
            return "high"
        if "medium" in severities:
            return "medium"
        if "low" in severities:
            return "low"
        return "info"
