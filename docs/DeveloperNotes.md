# Developer Notes

## 절대 우선 원칙

데이터 안정성이 기능보다 중요합니다.

## 데이터 구조

현재 앱 데이터는 localStorage 및 GitHub Backup JSON을 기준으로 유지합니다.

핵심 필드 예시:

- `cards`
- `groups`
- `history`
- `monthlyRecords`
- `lastBackupAt`
- `meta`

## 카드 주요 필드

- `id`
- `name`
- `short`
- `group`
- `color`
- `target`
- `spent`
- `hidden`
- `kind`
- `periodType`
- `memo`
- `annualGoal`
- `annualSpent`
- `mPoint`

## periodType

- `hyundai`: 현대카드 24일 ~ 23일 기준
- `monthly`: 일반카드 1일 ~ 말일 기준

## 수정 시 주의

- 기존 JSON 백업이 깨지지 않아야 합니다.
- 카드 ID를 임의로 바꾸지 않습니다.
- `monthlyRecords` 키 구조를 함부로 변경하지 않습니다.
- RED의 `annualSpent`, `annualGoal`은 유지해야 합니다.
- M BOOST의 `mPoint` 관련 필드는 호환성을 고려해야 합니다.
- Stable 버전은 직접 수정하지 않고 Beta에서 검증합니다.

## version.json

업데이트 확인용 기준 파일입니다.

필드:

- `version`
- `build`
- `releaseDate`
- `dataVersion`
- `channel`
- `message`
- `releaseNotes`

## v7.1.4 UI Guard

v7.1.4는 `v7.1.0_ui_beta(2)`를 기준으로 재시작한 UI Beta입니다.

원칙:

- 모바일 정상 레이아웃을 먼저 보존한다.
- `dashboard-section`과 `settings-section`은 탭 상태에 따라 완전히 분리한다.
- Desktop/iPad/Mobile CSS는 media query와 `data-layout`을 함께 사용한다.
- 데이터 저장 키, GitHub 백업 구조, 월별 히스토리 구조는 수정하지 않는다.
