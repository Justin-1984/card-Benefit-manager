# CHANGELOG

## v7.4.0 Subscription Planner Beta
- 구독 캘린더 패널 추가
- 카드 추천 시스템 추가
- 카테고리별 구독 분석 추가
- 카드별 구독 부담액 분석 추가
- 자동 실적 반영은 보류하고 수동 반영/중복 방지 유지

# Changelog

## v7.4.0 Subscription Planner Beta
- 구독 실적 반영 시 월/카드/금액/반영 전후 금액 로그를 저장하도록 안정화
- 기존 timestamp-only appliedMonths 데이터를 객체 형태로 자동 마이그레이션
- 이번달 일괄 반영 시 총액 확인 후 한 번만 렌더/백업되도록 개선
- 월별 히스토리에 구독 실적 반영 로그 표시 추가
- 중복 반영 방지 기준을 `subscriptionApplied()`로 통일

## v7.3.0 Subscription Engine Beta
- 구독 캘린더 추가
- 카드별 구독 예상 실적 표시 추가
- 실제 실적 반영 전 예상 달성률/남은 금액 확인 가능
- 구독 탭 전용 UX 유지
- 데이터/백업/GitHub 구조 변경 없음

## v7.2.2 Subscriptions UX Fix
- 구독 탭에서 카드 리스트 노출 문제 수정
