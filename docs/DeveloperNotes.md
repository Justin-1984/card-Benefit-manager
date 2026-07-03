# Developer Notes - v7.2.2

## Data Policy

기존 카드 데이터 키는 유지한다.

- STORE: benefit-manager-v6.2
- SUB_STORE: benefit-manager-subscriptions-v7.2.2

구독 데이터는 별도 LocalStorage에 저장하며, 카드 데이터 구조를 직접 변경하지 않는다.

## Subscription Apply Policy

구독 결제를 카드 실적에 반영할 때는 `appliedMonths[YYYY-MM]`로 중복 반영을 방지한다.

## Backup Policy

수동 백업과 GitHub export payload에는 `subscriptions`를 top-level로 포함한다.
