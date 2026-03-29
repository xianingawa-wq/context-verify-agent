class ContractClassifier:
    def classify(self, text: str) -> str:
        if "采购" in text:
            return "采购合同"
        return "通用合同"
