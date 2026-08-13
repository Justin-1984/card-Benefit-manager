# v7.4.14 Developer Notes

- 구독 리스트 렌더링을 `subscriptionCardMarkup()` 공통 카드 마크업으로 분리했습니다.
- `renderSubscriptionListByCard()`를 추가해 연결 카드 기준 그룹을 구성합니다.
- 보기 모드는 `benefit-manager-subscription-list-mode-v7.4`에 저장합니다.
- 구독 금액 계산 함수와 카드 `spent` 데이터는 변경하지 않았습니다.

# v7.4.13 Developer Notes

- Base: v7.4.12 Subscription Pending Projection Fix
- Fixed pending subscription amount fallback.
- Pending records with stale `actualAmount: 0` are treated as planned amount unless the payment record is actual/paid.
- Actual amount overrides planned amount only when `paid === true`, `mode === 'actual-payment'`, or `includedInCurrentSpent === true`.
- Removed visible subscription recommendation UI and render call.
- No card `spent` mutation. Card data and subscription data remain separated.

# v7.4.12 Developer Notes

- Fixed pending subscription projection for future due dates within current card performance period.
- Legacy subscriptions without explicit v7.4.12 manual schedule-only choice are treated as performance-applicable.
- Manual opt-out is preserved only when `autoApply=false` and `autoApplyManual=true`.
- `card.spent` is not mutated by subscription projection.

# v7.4.11 Developer Notes

- 구독 결제건은 `subscription.paymentRecords[periodKey|dueDate]`에 저장합니다.
- 저장 필드: `plannedAmount`, `actualAmount`, `paidDate`, `includedInCurrentSpent`, `dueDate`, `updatedAt`.
- `card.spent`는 사용자가 입력한 카드사 현재 사용금액이며 구독 금액을 직접 더하지 않습니다.
- 예상 실적 계산: `현재 사용금액 - 현재금액 포함 구독액 + 현재 실적기간 전체 구독 예정/실제금액`.
- 실제 결제금액이 있는 구독은 예정금액 대신 `actualAmount`를 사용합니다.
- `includedInCurrentSpent=false`인 결제건은 실제 결제됨 상태여도 현재 사용금액에 포함된 것으로 보지 않습니다.
- 기존 `appliedMonths`는 현재금액 포함 확인 호환용으로 유지합니다.
- v7.4.10의 `monthlyRecordLog` 수정/삭제 구조와 카드별 기간 정책은 변경하지 않았습니다.

---

# v7.4.10 Developer Notes

- `monthlyRecordLog` 입력 기록은 삭제뿐 아니라 직접 수정할 수 있습니다.
- 수정 가능 필드: `spent`, `target`, `key`/`label`(실적기간), `savedAt`/`savedAtMs`(기록 일시).
- 원본 `id`는 유지하고 `editedAt`, `editedAtMs`를 추가해 수정 여부를 보존합니다.
- 기간 변경 시 `rebuildFinalRecordFromLog()`를 이전 key와 새 key에 각각 실행합니다.
- 최종 반영은 같은 카드·같은 기간의 가장 큰 `savedAtMs` 기록을 사용합니다.
- 수정 후 `updateRedAnnualFromRecords(true)`로 RED 연간 누적을 즉시 재계산합니다.
- 기간 정책과 카드/구독 저장소 분리는 v7.4.9와 동일합니다.

---

# v7.4.9 Developer Notes

- `monthlyRecordLog`: 사용자의 모든 실적 입력 이력
- `monthlyRecords`: 월별·연간 계산에 사용하는 기간별 최종 반영값
- 입력 이력 삭제 시 `rebuildFinalRecordFromLog()`가 같은 카드/기간의 최신 잔여 이력으로 최종값을 다시 구성합니다.
- 최종 반영 삭제는 입력 이력을 건드리지 않습니다.
- 기간 정책: `kind === 'mboost'`만 `hyundai`; 나머지는 모두 `monthly`.
- 기존 잘못된 히스토리는 자동 삭제하지 않습니다.

---

# v7.4.8 Developer Notes

- Confirmed baseline: v7.4.6.
- `monthlyRecords` is the canonical latest value per card/period.
- `monthlyRecordLog` is append-only (maximum 500 entries) and preserves every save.
- Migration copies legacy entries into the log before canonical normalization.
- Annual totals use only canonical `monthlyRecords`.

---

# Developer Notes - v7.4.5

## Baseline
다음 작업은 반드시 `v7.4.5 Actual & Projected Performance` 또는 사용자가 별도로 지정한 더 최신 검증 ZIP에서 시작한다.

## Project Scope
카드매니저 전용이다. 신용카드 사용금액, 실적, 혜택, 구독 결제, 결제 일정, 히스토리, 통계 및 카드 최적화만 다룬다. 자산관리, 코인, 거래소, 증권 기능은 추가하지 않는다.

## Data Stores
- 카드 데이터: `benefit-manager-v6.2`
- 구독 데이터: `benefit-manager-subscriptions-v7.2.1`
- 카드와 구독 데이터는 계속 분리한다.
- v7.4.5에서 카드 객체에 `spentAsOfDate`를 추가했다.

## Actual & Projected Performance Policy
`card.spent`는 사용자가 카드사 앱에서 확인해 직접 입력한 현재 사용금액이다. 구독 금액을 `card.spent`에 자동 또는 수동으로 더하지 않는다.

예상 실적은 다음 방식으로만 계산한다.

1. 카드별 현재 실적기간을 구한다.
2. 카드의 `spentAsOfDate` 이후에 결제될 구독을 찾는다.
3. 활성 상태, 연결 카드 일치, `autoApply=true`인 구독만 포함한다.
4. `appliedMonths[periodKey]`에 현재 사용금액 포함 확인 기록이 있으면 제외한다.
5. `예상 실적 = card.spent + 남은 예정 구독`으로 계산한다.

`autoApply` 필드는 호환성을 위해 유지하지만 v7.4.5부터 의미는 **예정 구독으로 예상 실적에 포함**이다. 실제 금액 자동 반영을 뜻하지 않는다.

## Subscription Confirmation Policy
구독 화면의 `현재 금액 포함`은 카드 사용금액을 증가시키지 않는다. 해당 실적기간에 이미 현재 사용금액에 들어간 항목으로 기록해 예정 구독 계산에서 제외한다. `예정으로 되돌리기`로 취소할 수 있다.

## Reset Policy
새 실적기간으로 전환할 때 `spent=0`으로 초기화하고 `spentAsOfDate`를 새 기간 시작 전날로 설정한다. 따라서 새 기간의 모든 예정 구독이 예상 실적에 포함된다.

## UI Policy
카드 화면에는 다음을 구분해 표시한다.
- 현재 사용금액
- 남은 예정 구독
- 예상 실적
- 추가 사용 필요액

진한 진행 막대는 현재 사용금액, 연한 막대는 예정 구독을 포함한 예상 실적이다.
