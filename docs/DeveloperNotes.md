# Developer Notes - v7.3.1

## Data Policy

기존 카드 데이터 키는 유지한다.

- STORE: benefit-manager-v6.2
- SUB_STORE: benefit-manager-subscriptions-v7.3
- Legacy migration: benefit-manager-subscriptions-v7.2.2, benefit-manager-subscriptions-v7.2.1

구독 데이터는 별도 LocalStorage에 저장하며, 카드 데이터 구조를 직접 변경하지 않는다.

## Subscription Projection Policy

구독 결제는 카드 화면의 `구독 포함 예상` 값으로만 합산한다.
결제 확인은 `appliedMonths[YYYY-MM]`로 구독 데이터에만 저장한다.
카드의 `spent`, `annualSpent`, `monthlyRecords`, `history`는 구독 확인 동작으로 수정하지 않는다.

## Backup Policy

수동 백업과 GitHub export payload에는 `subscriptions`를 top-level로 포함한다.
