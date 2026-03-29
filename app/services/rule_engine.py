from app.data.rules import RULES
from app.schemas.review import RiskItem


class RuleEngine:
    def check(self, contract_type: str, text: str) -> list[RiskItem]:
        risks: list[RiskItem] = []
        rules = RULES.get("通用合同", []) + RULES.get(contract_type, [])

        for rule in rules:
            risk = self._apply_rule(rule, text)
            if risk:
                risks.append(risk)

        return risks

    def _apply_rule(self, rule: dict, text: str) -> RiskItem | None:
        trigger_keywords = rule.get("trigger_keywords", [])
        missing_keywords = rule.get("missing_keywords", [])
        must_have_any = rule.get("must_have_any", [])

        if trigger_keywords and any(keyword in text for keyword in trigger_keywords):
            if must_have_any and any(keyword in text for keyword in must_have_any):
                return None
            evidence = self._find_evidence(text, trigger_keywords)
            return self._build_risk(rule, evidence)

        if missing_keywords and not any(keyword in text for keyword in missing_keywords):
            evidence = "合同全文未发现相关关键词。"
            return self._build_risk(rule, evidence)

        return None

    def _find_evidence(self, text: str, keywords: list[str]) -> str:
        for line in text.splitlines():
            if any(keyword in line for keyword in keywords):
                return line.strip()
        return "命中规则关键词，但未能精确定位到单行证据。"

    def _build_risk(self, rule: dict, evidence: str) -> RiskItem:
        return RiskItem(
            rule_id=rule["rule_id"],
            title=rule["title"],
            severity=rule["severity"],
            description=rule["description"],
            evidence=evidence,
            suggestion=rule["suggestion"],
        )
