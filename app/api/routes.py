from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile

from app.core.config import settings
from app.schemas.chat import ChatRequest, ChatResponse
from app.schemas.document import ParseResponse
from app.schemas.review import HealthResponse, ReviewRequest, ReviewResponse
from app.schemas.workbench import (
    WorkbenchChatRequest,
    WorkbenchChatResponse,
    WorkbenchContractDetailResponse,
    WorkbenchContractListResponse,
    WorkbenchHistoryItem,
    WorkbenchImportResponse,
    WorkbenchIssueDecisionRequest,
    WorkbenchReviewResult,
    WorkbenchScanResponse,
    WorkbenchSummaryResponse,
)
from app.services.chat_service import ChatService
from app.services.review_service import ReviewService
from app.services.workbench_service import WorkbenchService


router = APIRouter()
review_service = ReviewService()
chat_service = ChatService()
workbench_service = WorkbenchService()


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return review_service.health()


@router.get("/api/workbench/summary", response_model=WorkbenchSummaryResponse)
def get_workbench_summary() -> WorkbenchSummaryResponse:
    return workbench_service.get_summary()


@router.get("/api/workbench/contracts", response_model=WorkbenchContractListResponse)
def list_workbench_contracts(
    status: str | None = Query(default=None),
    search: str | None = Query(default=None),
) -> WorkbenchContractListResponse:
    return workbench_service.list_contracts(status=status, search=search)


@router.get("/api/workbench/contracts/{contract_id}", response_model=WorkbenchContractDetailResponse)
def get_workbench_contract(contract_id: str) -> WorkbenchContractDetailResponse:
    try:
        return workbench_service.get_contract_detail(contract_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/api/workbench/contracts/{contract_id}/scan", response_model=WorkbenchScanResponse)
def scan_workbench_contract(
    contract_id: str,
    contract_type: str | None = Form(default=None),
    our_side: str = Form(default="甲方"),
) -> WorkbenchScanResponse:
    try:
        return workbench_service.scan_contract(contract_id, contract_type=contract_type, our_side=our_side)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/api/workbench/contracts/{contract_id}/chat", response_model=WorkbenchChatResponse)
def chat_workbench_contract(contract_id: str, payload: WorkbenchChatRequest) -> WorkbenchChatResponse:
    try:
        return workbench_service.chat_contract(contract_id, payload)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post(
    "/api/workbench/contracts/{contract_id}/issues/{issue_id}/decision",
    response_model=WorkbenchReviewResult,
)
def decide_workbench_issue(
    contract_id: str,
    issue_id: str,
    payload: WorkbenchIssueDecisionRequest,
) -> WorkbenchReviewResult:
    try:
        return workbench_service.decide_issue(contract_id, issue_id, payload)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/api/workbench/contracts/{contract_id}/history", response_model=list[WorkbenchHistoryItem])
def get_workbench_history(contract_id: str) -> list[WorkbenchHistoryItem]:
    try:
        return workbench_service.get_history(contract_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/api/workbench/contracts/import", response_model=WorkbenchImportResponse)
async def import_workbench_contract(
    file: UploadFile = File(...),
    contract_type: str | None = Form(default=None),
    author: str = Form(default="系统导入"),
) -> WorkbenchImportResponse:
    if not file.filename:
        raise HTTPException(status_code=400, detail="缺少上传文件名。")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="上传文件不能为空。")
    if len(content) > settings.max_upload_size_bytes:
        raise HTTPException(status_code=400, detail="上传文件过大，请控制在 5MB 以内。")

    try:
        return workbench_service.import_contract(
            file_name=file.filename,
            content=content,
            contract_type=contract_type,
            author=author,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post(
    "/parse",
    response_model=ParseResponse,
    summary="上传文件并解析",
    description="上传 txt/docx/pdf 合同文件，返回解析后的结构化文档。",
)
async def parse_contract(file: UploadFile = File(...)) -> ParseResponse:
    if not file.filename:
        raise HTTPException(status_code=400, detail="缺少上传文件名。")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="上传文件不能为空。")
    if len(content) > settings.max_upload_size_bytes:
        raise HTTPException(status_code=400, detail="上传文件过大，请控制在 5MB 以内。")

    try:
        return ParseResponse(document=review_service.parse_file(file.filename, content))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post(
    "/review",
    response_model=ReviewResponse,
    summary="校审合同文本",
    description="提交合同全文文本，返回结构化校审报告。",
)
def review_contract(payload: ReviewRequest) -> ReviewResponse:
    try:
        return review_service.review(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post(
    "/review/file",
    response_model=ReviewResponse,
    summary="上传文件并校审",
    description="上传 txt/docx/pdf 合同文件，返回结构化校审报告。",
)
async def review_contract_file(
    file: UploadFile = File(...),
    contract_type: str | None = Form(default=None),
    our_side: str = Form(default="甲方"),
) -> ReviewResponse:
    if not file.filename:
        raise HTTPException(status_code=400, detail="缺少上传文件名。")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="上传文件不能为空。")
    if len(content) > settings.max_upload_size_bytes:
        raise HTTPException(status_code=400, detail="上传文件过大，请控制在 5MB 以内。")

    try:
        return review_service.review_file(
            file_name=file.filename,
            content=content,
            contract_type=contract_type,
            our_side=our_side,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post(
    "/chat",
    response_model=ChatResponse,
    summary="聊天式合同助手",
    description="根据用户意图自动调用搜索、审查、建议或普通对话能力。",
)
def chat(payload: ChatRequest) -> ChatResponse:
    try:
        return chat_service.chat(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
