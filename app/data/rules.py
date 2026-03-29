RULES = {
    "采购合同": [
        {
            "rule_id": "PAY_001",
            "title": "付款节点早于验收",
            "severity": "high",
            "description": "若合同约定预付款比例过高，且未设置验收或履约保障，则提示资金风险。",
            "trigger_keywords": ["支付100%", "签订后", "预付款", "付款"],
            "must_have_any": ["验收", "验收标准", "验收合格"],
            "suggestion": "建议改为分阶段付款，并将尾款与验收合格挂钩。",
        },
        {
            "rule_id": "ACC_001",
            "title": "缺少验收条款",
            "severity": "high",
            "description": "采购合同通常需要明确验收标准、验收时间和异议期限。",
            "missing_keywords": ["验收", "验收标准", "验收合格"],
            "suggestion": "建议补充验收标准、验收流程、验收期限和异议处理方式。",
        },
        {
            "rule_id": "JUR_001",
            "title": "争议管辖可能对我方不利",
            "severity": "medium",
            "description": "若争议解决地约定为对方所在地，通常对我方诉讼不利。",
            "trigger_keywords": ["乙方所在地人民法院", "卖方所在地人民法院"],
            "suggestion": "建议优先约定我方所在地法院或更中立的争议解决方式。",
        },
    ],
    "通用合同": [
        {
            "rule_id": "GEN_001",
            "title": "缺少合同主体信息",
            "severity": "high",
            "description": "合同通常应明确双方主体名称。",
            "missing_keywords": ["甲方", "乙方"],
            "suggestion": "建议补充完整的合同主体名称与身份信息。",
        },
        {
            "rule_id": "GEN_002",
            "title": "缺少合同金额信息",
            "severity": "medium",
            "description": "若合同未明确金额、计价方式或价税口径，后续履约容易争议。",
            "missing_keywords": ["元", "人民币", "合同总价"],
            "suggestion": "建议补充合同金额、币种、税费承担和计价方式。",
        },
    ],
}
