# CHANGELOG

## v7.3.1 Subscription Engine Safety Fix
- 구독 결제 확인 시 카드 `spent` 값을 직접 수정하지 않도록 변경
- 구독 포함 실적은 Projection UI에서만 예상치로 표시
- `SUB_STORE`를 `benefit-manager-subscriptions-v7.3`으로 분리
- v7.2.1/v7.2.2 구독 데이터 자동 마이그레이션 추가
- 구독 화면 문구를 `실적 반영`에서 `결제 확인 / 예상 실적` 기준으로 정리
- 카드/History/GitHub 데이터 구조 변경 없음

## v7.3.0 Subscription Engine Beta
- 구독 캘린더 추가
- 카드별 구독 예상 실적 표시 추가
- 실제 실적 반영 전 예상 달성률/남은 금액 확인 가능
- 구독 탭 전용 UX 유지
- 데이터/백업/GitHub 구조 변경 없음

## v7.2.2 Subscriptions UX Fix
- 구독 탭에서 카드 리스트 노출 문제 수정
