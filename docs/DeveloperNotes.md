# Developer Notes - v7.4.1

## ⚠️ 반드시 읽어주세요: 이 문서가 사라지면 같은 버그가 또 생깁니다

이 프로젝트는 v6.7.0부터 여러 세대의 CSS 테마(파스텔 → 화이트/클린 → 다크 네이비)가 `!important`로 겹겹이 쌓여왔습니다. 최종적으로 적용되는 색은 **가장 마지막에 선언된 `!important` 규칙**입니다.

**실제로 있었던 일**: v7.3.2에서 구독 카드/카드 상세/우선순위 배지의 다크 테마 배색 충돌 버그를 고쳤는데, 이후 다른 작업(GPT, v7.4.0 Subscription Planner)이 그 수정 이전 버전(v7.3.1)을 기준으로 진행되어 **고쳤던 버그 3건이 그대로 재발**했습니다. v7.4.1에서 다시 수정했습니다.

**재발 방지 원칙**:
1. 새 기능을 추가하기 전에 반드시 현재 배포된 최신 Stable ZIP(버전 번호가 가장 높은 것)을 기준으로 작업하세요. GPT/Claude 등 어느 쪽에서 작업하든 동일합니다.
2. 색상 관련 클래스를 수정할 때는 `grep -n ".클래스명"`으로 전체 파일에서 몇 번 정의됐는지 먼저 확인하고, 새 `!important` 레이어를 또 쌓기보다 기존 규칙을 직접 수정하세요.
3. `@media (prefers-color-scheme:dark)`에 의존하는 색상 규칙은 이 앱에는 적합하지 않습니다 — 앱이 OS 설정과 무관하게 항상 다크 테마로 렌더링되기 때문입니다.

## Data Policy

기존 카드 데이터 키는 유지한다.

- STORE: benefit-manager-v6.2
- SUB_STORE: benefit-manager-subscriptions-v7.2.2

구독 데이터는 별도 LocalStorage에 저장하며, 카드 데이터 구조를 직접 변경하지 않는다.

## Subscription Apply Policy

구독 결제를 카드 실적에 반영할 때는 `appliedMonths[YYYY-MM]`로 중복 반영을 방지한다.

## Backup Policy

수동 백업과 GitHub export payload에는 `subscriptions`를 top-level로 포함한다.
