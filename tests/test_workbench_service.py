import tempfile
import unittest
from datetime import datetime, timezone

from app.schemas.chat import ChatResponse
from app.schemas.document import DocumentMetadata, ParsedDocument
from app.schemas.review import ExtractedFields, ReviewReport, ReviewResponse, ReviewSummary, RiskItem
from app.schemas.workbench import WorkbenchChatRequest, WorkbenchIssueDecisionRequest
from app.services.workbench_repository import WorkbenchRepository
from app.services.workbench_service import WorkbenchService


class FakeReviewService:
    def review(self, payload):
        return ReviewResponse(
            summary=ReviewSummary(contract_type=payload.contract_type or "采购合同", overall_risk="medium", risk_count=1),
            extracted_fields=ExtractedFields(contract_name="测试合同"),
            risks=[
                RiskItem(
                    rule_id="PAY_001",
                    title="付款条款可能早于验收",
                    severity="high",
                    description="desc",
                    evidence="甲方应于合同签订后5日内支付100%合同价款。",
                    suggestion="建议改为分阶段付款。",
                    risk_domain="付款",
                    clause_no="第二条",
                    section_title="付款方式",
                    start_offset=12,
                    end_offset=32,
                )
            ],
            report=ReviewReport(
                generated_at=datetime(2026, 4, 7, tzinfo=timezone.utc),
                overview="已完成校审。",
                key_findings=["付款条款可能早于验收"],
                next_actions=["建议改为分阶段付款。"],
            ),
        )

    def parse_file(self, file_name, content):
        return ParsedDocument(
            metadata=DocumentMetadata(
                doc_id="doc-1",
                file_name=file_name,
                file_type="txt",
                source_path=file_name,
                title="导入合同",
                contract_type_hint="采购合同",
                page_count=1,
            ),
            raw_text=content.decode("utf-8"),
            spans=[],
            clause_chunks=[],
        )


class FakeChatService:
    def __init__(self):
        self.return_review = False

    def chat(self, payload):
        review_result = FakeReviewService().review(type("Payload", (), {"contract_type": payload.contract_type})) if self.return_review else None
        return ChatResponse(
            intent="review" if self.return_review else "chat",
            tool_used="review" if self.return_review else "chat",
            answer="这是基于合同的回复。",
            generated_at=datetime.now(timezone.utc),
            search_results=[],
            review_result=review_result,
        )


class WorkbenchServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tempdir = tempfile.TemporaryDirectory()
        self.repository = WorkbenchRepository(base_dir=self.tempdir.name)
        self.chat_service = FakeChatService()
        self.service = WorkbenchService(
            repository=self.repository,
            review_service=FakeReviewService(),
            chat_service=self.chat_service,
        )

    def tearDown(self) -> None:
        self.tempdir.cleanup()

    def test_list_contracts_returns_seed_data(self) -> None:
        response = self.service.list_contracts()

        self.assertEqual(response.total, 4)
        self.assertTrue(any(item.id == "contract-001" for item in response.items))

    def test_get_contract_detail_returns_content_and_status(self) -> None:
        response = self.service.get_contract_detail("contract-001")

        self.assertEqual(response.contract.id, "contract-001")
        self.assertEqual(response.contract.status, "reviewing")
        self.assertIn("采购合同", response.contract.content)

    def test_scan_contract_persists_latest_review(self) -> None:
        response = self.service.scan_contract("contract-001")
        detail = self.service.get_contract_detail("contract-001")

        self.assertEqual(response.latestReview.summary.risk_count, 1)
        self.assertEqual(detail.latestReview.issues[0].id, "PAY_001-12-1")
        self.assertEqual(detail.contract.status, "reviewing")

    def test_issue_decision_is_persisted(self) -> None:
        self.service.scan_contract("contract-001")

        review = self.service.decide_issue(
            "contract-001",
            "PAY_001-12-1",
            WorkbenchIssueDecisionRequest(status="accepted"),
        )
        detail = self.service.get_contract_detail("contract-001")

        self.assertEqual(review.issues[0].status, "accepted")
        self.assertEqual(detail.latestReview.issues[0].status, "accepted")
        self.assertEqual(detail.contract.status, "approved")

    def test_chat_contract_persists_messages_and_history(self) -> None:
        response = self.service.chat_contract("contract-001", payload=WorkbenchChatRequest(message="请解释争议条款"))
        detail = self.service.get_contract_detail("contract-001")
        history = self.service.get_history("contract-001")

        self.assertEqual(response.assistantMessage.role, "assistant")
        self.assertEqual(len(detail.chatMessages), 2)
        self.assertEqual(history[0].type, "chat")

    def test_chat_contract_can_persist_review_result(self) -> None:
        self.chat_service.return_review = True

        response = self.service.chat_contract("contract-001", payload=WorkbenchChatRequest(message="请重新审查"))
        detail = self.service.get_contract_detail("contract-001")

        self.assertEqual(response.intent, "review")
        self.assertIsNotNone(response.latestReview)
        self.assertIsNotNone(detail.latestReview)

    def test_import_contract_creates_new_record(self) -> None:
        response = self.service.import_contract(file_name="new.txt", content="导入的合同正文".encode("utf-8"))
        detail = self.service.get_contract_detail(response.contract.id)

        self.assertEqual(response.contract.title, "导入合同")
        self.assertEqual(detail.contract.author, "系统导入")
        self.assertEqual(self.service.list_contracts().total, 5)

    def test_missing_contract_raises_key_error(self) -> None:
        with self.assertRaises(KeyError):
            self.service.get_contract_detail("missing")


if __name__ == "__main__":
    unittest.main()

