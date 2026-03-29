from fastapi import APIRouter

from app.schemas.review import HealthResponse, ReviewRequest, ReviewResponse
from app.services.review_service import ReviewService


router = APIRouter()
review_service = ReviewService()


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok")


@router.post("/review", response_model=ReviewResponse)
def review_contract(payload: ReviewRequest) -> ReviewResponse:
    return review_service.review(payload)
