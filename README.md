# Contract Review Agent MVP

这是一个“合同校审 agent”的最小可运行骨架，目标是先打通最核心链路：

- 接收合同文本
- 识别合同类型
- 抽取基础字段
- 执行规则检查
- 输出结构化风险结果

当前版本故意保持简单，便于你后续接入：

- PDF / Word 解析
- OCR
- RAG / 知识库
- LLM 风险解释与改写
- 前端页面

## 目录结构

```text
app/
  api/
  core/
  data/
  schemas/
  services/
main.py
requirements.txt
```

## 运行方式

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload
```

启动后访问：

- `GET /health`
- `POST /review`

## 请求示例

```json
{
  "contract_text": "采购合同\n甲方：甲公司\n乙方：乙公司\n合同总价为100000元。\n甲方应于合同签订后5日内支付100%合同价款。\n本合同未约定验收标准。\n争议由乙方所在地人民法院管辖。",
  "contract_type": "采购合同",
  "our_side": "甲方"
}
```

## 返回示例

接口会返回：

- 合同摘要
- 抽取字段
- 命中的风险项
- 总体风险等级

## 下一步建议

你可以按下面顺序扩展：

1. 接 `pdf/docx` 解析
2. 补更多合同类型规则
3. 接 LLM 做语义补充和修订建议
4. 接知识库做依据引用
5. 做前端高亮原文
