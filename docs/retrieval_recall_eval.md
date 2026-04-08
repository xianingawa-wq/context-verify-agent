# Retrieval Recall Evaluation (Recall@k)

本项目新增了离线检索召回评估脚本：`app/rag/eval_recall.py`。

## 1. Gold Set JSONL 格式

每行一个风险项样本，字段如下：

- `risk_id` (string, required)
- `contract_id` (string, required)
- `contract_type` (string, required)
- `query` (string, required)
- `gold_article_labels` (array[string], required, 至少1个)
- `severity` (string, optional)
- `note` (string, optional)

示例：

```json
{"risk_id":"r1","contract_id":"c1","contract_type":"采购合同","query":"付款违约责任法条","gold_article_labels":["第一百零九条"],"severity":"high","note":"付款条款"}
{"risk_id":"r2","contract_id":"c1","contract_type":"采购合同","query":"争议管辖法条","gold_article_labels":["第一百二十条"],"severity":"medium"}
```

## 2. 运行命令

```powershell
python -m app.rag.eval_recall --dataset .\your_dataset.jsonl --output-dir .\reports\recall_eval
```

默认计算：`Recall@1/3/5`。

自定义 K：

```powershell
python -m app.rag.eval_recall --dataset .\your_dataset.jsonl --k 1 3 5 --output-dir .\reports\recall_eval
```

可选过滤：

```powershell
python -m app.rag.eval_recall --dataset .\your_dataset.jsonl --output-dir .\reports\recall_eval --filter-contract-type 采购合同 --filter-severity high
```

## 3. 输出文件

脚本会在 `output-dir` 下生成：

- `summary.json`：总览指标（overall + 分组）
- `details.jsonl`：每条样本的 top-k 检索明细和命中情况
- `miss_cases.jsonl`：在最大 k 下未命中的样本
- `baseline_summary.json`：首次运行自动固化基线
- `comparison.json`：若基线存在则输出与基线差异（delta）

## 4. 命中规则

命中采用法条 ID 精确匹配：

- 从检索结果 metadata 读取 `article_label`
- 与样本 `gold_article_labels` 精确比较
- `Recall@k = 命中样本数 / 总样本数`
