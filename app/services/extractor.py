import re

from app.schemas.review import ExtractedFields


class ContractExtractor:
    def extract(self, text: str) -> ExtractedFields:
        return ExtractedFields(
            contract_name=self._extract_contract_name(text),
            party_a=self._extract_party(text, "甲方"),
            party_b=self._extract_party(text, "乙方"),
            amount=self._extract_amount(text),
            dispute_clause=self._extract_dispute_clause(text),
        )

    def _extract_contract_name(self, text: str) -> str | None:
        first_line = text.strip().splitlines()[0] if text.strip() else ""
        return first_line[:100] or None

    def _extract_party(self, text: str, role: str) -> str | None:
        match = re.search(rf"{role}[:：]\s*(.+)", text)
        return match.group(1).strip() if match else None

    def _extract_amount(self, text: str) -> str | None:
        match = re.search(r"(\d+(?:\.\d+)?)\s*元", text)
        return f"{match.group(1)}元" if match else None

    def _extract_dispute_clause(self, text: str) -> str | None:
        for line in text.splitlines():
            if "争议" in line or "管辖" in line:
                return line.strip()
        return None
