import json
import tempfile
import unittest
from pathlib import Path

from langchain_core.documents import Document

from app.rag.eval_recall import compare_with_baseline, run_evaluation
from app.rag.retriever import ContractKnowledgeRetriever


class FakeVectorStore:
    def __init__(self, mapping: dict[str, list[Document]]) -> None:
        self.mapping = mapping

    def similarity_search(self, query: str, k: int = 3) -> list[Document]:
        return list(self.mapping.get(query, []))[:k]


class EvalRecallTests(unittest.TestCase):
    def test_run_evaluation_computes_recall_and_outputs_files(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            dataset_path = Path(tmp) / "dataset.jsonl"
            output_dir = Path(tmp) / "report"

            dataset_rows = [
                {
                    "risk_id": "r1",
                    "contract_id": "c1",
                    "contract_type": "采购合同",
                    "query": "付款违约金法条",
                    "gold_article_labels": ["第一百零九条"],
                    "severity": "high",
                    "note": "sample1",
                },
                {
                    "risk_id": "r2",
                    "contract_id": "c2",
                    "contract_type": "服务合同",
                    "query": "管辖条款法条",
                    "gold_article_labels": ["第一百一十条"],
                    "severity": "medium",
                    "note": "sample2",
                },
            ]
            dataset_path.write_text("\n".join(json.dumps(row, ensure_ascii=False) for row in dataset_rows), encoding="utf-8")

            retriever = ContractKnowledgeRetriever(
                FakeVectorStore(
                    {
                        "付款违约金法条": [
                            Document(page_content="a", metadata={"article_label": "第二条", "title": "law"}),
                            Document(page_content="b", metadata={"article_label": "第一百零九条", "title": "law"}),
                        ],
                        "管辖条款法条": [
                            Document(page_content="a", metadata={"article_label": "第九十九条", "title": "law"}),
                            Document(page_content="b", metadata={"article_label": "第一百条", "title": "law"}),
                        ],
                    }
                )
            )

            result = run_evaluation(
                dataset_path=str(dataset_path),
                output_dir=str(output_dir),
                k_values=[1, 3, 5],
                retriever=retriever,
                use_rerank=False,
                fetch_k=5,
                final_k=5,
            )

            self.assertEqual(result["sample_count"], 2)
            self.assertTrue((output_dir / "summary.json").exists())
            self.assertTrue((output_dir / "details.jsonl").exists())
            self.assertTrue((output_dir / "miss_cases.jsonl").exists())
            self.assertTrue((output_dir / "baseline_summary.json").exists())

            summary = json.loads((output_dir / "summary.json").read_text(encoding="utf-8"))
            self.assertEqual(summary["overall"]["recall_at_1"], 0.0)
            self.assertEqual(summary["overall"]["recall_at_3"], 0.5)
            self.assertEqual(summary["overall"]["recall_at_5"], 0.5)
            self.assertEqual(summary["by_contract_type"]["采购合同"]["recall_at_3"], 1.0)
            self.assertEqual(summary["by_contract_type"]["服务合同"]["recall_at_3"], 0.0)
            self.assertEqual(summary["by_severity"]["high"]["recall_at_3"], 1.0)
            self.assertEqual(summary["by_severity"]["medium"]["recall_at_3"], 0.0)
            self.assertFalse(summary["retrieval_config"]["use_rerank"])
            self.assertEqual(summary["retrieval_config"]["fetch_k"], 5)
            self.assertEqual(summary["retrieval_config"]["final_k"], 5)

            details_lines = (output_dir / "details.jsonl").read_text(encoding="utf-8").strip().splitlines()
            details = [json.loads(line) for line in details_lines]
            first = next(item for item in details if item["risk_id"] == "r1")
            self.assertFalse(first["hits_by_k"]["hit_at_1"])
            self.assertTrue(first["hits_by_k"]["hit_at_3"])
            self.assertIn("第一百零九条", first["matched_labels_by_k"]["matched_labels_at_3"])

            miss_lines = (output_dir / "miss_cases.jsonl").read_text(encoding="utf-8").strip().splitlines()
            self.assertEqual(len(miss_lines), 1)
            miss = json.loads(miss_lines[0])
            self.assertEqual(miss["risk_id"], "r2")

    def test_compare_with_baseline_computes_delta(self) -> None:
        current = {
            "k_values": [1, 3, 5],
            "overall": {"recall_at_1": 0.2, "recall_at_3": 0.5, "recall_at_5": 0.6},
            "by_contract_type": {
                "采购合同": {"recall_at_1": 0.1, "recall_at_3": 0.6, "recall_at_5": 0.7}
            },
            "by_severity": {
                "high": {"recall_at_1": 0.3, "recall_at_3": 0.7, "recall_at_5": 0.8}
            },
        }
        baseline = {
            "k_values": [1, 3, 5],
            "overall": {"recall_at_1": 0.1, "recall_at_3": 0.4, "recall_at_5": 0.6},
            "by_contract_type": {
                "采购合同": {"recall_at_1": 0.2, "recall_at_3": 0.5, "recall_at_5": 0.5}
            },
            "by_severity": {
                "high": {"recall_at_1": 0.2, "recall_at_3": 0.8, "recall_at_5": 0.8}
            },
        }

        comparison = compare_with_baseline(current, baseline)

        self.assertEqual(comparison["overall"]["delta_recall_at_1"], 0.1)
        self.assertEqual(comparison["overall"]["delta_recall_at_3"], 0.1)
        self.assertEqual(comparison["overall"]["delta_recall_at_5"], 0.0)
        self.assertEqual(comparison["by_contract_type"]["采购合同"]["delta_recall_at_1"], -0.1)
        self.assertEqual(comparison["by_severity"]["high"]["delta_recall_at_3"], -0.1)


if __name__ == "__main__":
    unittest.main()
