# Developer Notes - v7.3.2

## UI Theme Architecture (읽어보세요)

`index.html`의 `<style>` 블록은 v6.7.0부터 v7.3.1까지 총 9차례 이상 테마 전체를 `!important`로 덮어쓰는 방식으로 누적되어 있습니다 (파스텔 → 화이트/다크 클린 → 남색 지갑형 × 3세대 → v7.0~7.3 반응형 레이어). 최종적으로 화면에 보이는 색은 **가장 마지막에 선언된 `!important` 규칙**이 우선하며, 이 문서 작성 시점 기준 실질적으로 적용되는 테마는 v7.0.1 "UI Edition"(다크 네이비)입니다.

문제는 일부 컴포넌트(`ux-tile`, `subscription-card` 등)가 이 마지막 레이어에서 갱신되지 않고 훨씬 이전(v7.2.0 이전) 라이트 테마 값을 그대로 유지하고 있었다는 점입니다. v7.3.2에서 확인·수정한 항목은 CHANGELOG 참고.

**향후 작업 시 주의사항**: 새 UI 변경을 "이전 레이어 위에 새 `!important` 레이어 추가"하는 방식으로 계속하면 동일한 문제가 반복됩니다. 색상을 바꿀 때는 반드시 해당 클래스의 기존 선언을 전부 검색(`grep -n ".클래스명"`)해서 어떤 규칙이 최종적으로 이기는지 확인한 뒤, 새 레이어를 추가하기보다 기존 규칙을 직접 수정하는 것을 권장합니다.

## Developer Notes - v7.3.1

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
