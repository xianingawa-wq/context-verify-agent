import unittest
from datetime import datetime, timezone
from unittest.mock import Mock

from app.schemas.chat import ChatRequest
from app.schemas.review import ExtractedFields, ReviewReport, ReviewResponse, ReviewSummary
from app.services.chat_service import ChatService


class ChatServiceTests(unittest.TestCase):
    def test_parse_router_output_uses_json_when_valid(self) -> None:
        service = ChatService.__new__(ChatService)
        payload = ChatRequest(messages=[{"role": "user", "content": "find the legal basis for breach liability"}])

        data = service._parse_router_output(
            '{"intent":"search","query":"breach liability legal basis","reason":"user asks for basis"}',
            payload,
        )

        self.assertEqual(data["intent"], "search")
        self.assertEqual(data["query"], "breach liability legal basis")

    def test_parse_router_output_falls_back_to_review(self) -> None:
        service = ChatService.__new__(ChatService)
        payload = ChatRequest(messages=[{"role": "user", "content": "please review this contract for risks"}])

        data = service._parse_router_output("not-json", payload)

        self.assertEqual(data["intent"], "chat")

    def test_handle_review_requires_contract_text(self) -> None:
        service = ChatService.__new__(ChatService)
        payload = ChatRequest(messages=[{"role": "user", "content": "please review this"}])

        response = service._handle_review(payload, "please review this")

        self.assertEqual(response.intent, "review")
        self.assertEqual(response.tool_used, "review_guardrail")
        self.assertIn("合同正文", response.answer)

    def test_handle_review_returns_review_result_when_contract_available(self) -> None:
        service = ChatService.__new__(ChatService)
        service.review_service = Mock()
        service.review_service.review.return_value = ReviewResponse(
            summary=ReviewSummary(contract_type="procurement", overall_risk="medium", risk_count=2),
            extracted_fields=ExtractedFields(contract_name="contract"),
            risks=[],
            report=ReviewReport(
                generated_at=datetime(2026, 4, 1, tzinfo=timezone.utc),
                overview="ok",
                key_findings=["risk exists"],
                next_actions=["fix soon"],
            ),
        )
        payload = ChatRequest(
            messages=[{"role": "user", "content": "please review"}],
            contract_text="contract\nparty a: A\nparty b: B\nclause 1\nsubject",
            contract_type="procurement",
        )

        response = service._handle_review(payload, "please review")

        self.assertEqual(response.intent, "review")
        self.assertEqual(response.tool_used, "review")
        self.assertIsNotNone(response.review_result)
        self.assertIn("2", response.answer)

    def test_resolve_contract_text_from_latest_message(self) -> None:
        service = ChatService.__new__(ChatService)
        long_message = (
            "contract\n" + ("review content " * 12) + " party a and party b are both here with clause 1 text"
        )
        payload = ChatRequest(messages=[{"role": "user", "content": long_message}])

        resolved = service._resolve_contract_text(payload)

        self.assertIsNone(resolved)


if __name__ == "__main__":
    unittest.main()
