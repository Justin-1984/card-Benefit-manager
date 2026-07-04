# BenefitManager PWA

현재 버전: v7.3.1 Subscription Engine Safety Fix

## 핵심
- 카드 실적 관리
- 구독 결제 관리
- 구독 캘린더
- 카드별 구독 포함 예상 실적 표시
- GitHub Backup / Restore

## 데이터 원칙
기존 카드 데이터 구조는 유지합니다. 구독 데이터는 별도 LocalStorage 키에 저장하며 백업/GitHub 내보내기에 포함됩니다.

## v7.3.1 안전 수정
구독 결제 확인은 구독 데이터의 확인 상태만 저장합니다. 카드의 실제 사용금액(`spent`)은 직접 변경하지 않고, 카드 화면의 `구독 포함 예상` 계산으로만 보여줍니다.
