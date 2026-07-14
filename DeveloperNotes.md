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
