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


## v7.1.1 개발 메모

이번 버전은 UI Foundation 패치입니다. 데이터 레이어는 수정하지 않았습니다.

유지한 항목:

- 기존 `STORE` 키
- 기존 `MONTH` 키
- GitHub 설정/백업 함수
- History 및 monthlyRecords 구조
- RED/M BOOST 계산 로직

변경한 항목:

- APP_VERSION / APP_BUILD 표기
- version.json
- Service Worker cache name
- manifest theme/background color
- CSS 디자인 토큰 및 반응형 레이아웃 override

주의:

- 다음 버전에서 데이터 구조를 바꿔야 할 경우 반드시 migration 함수를 별도로 만들 것.
- Stable 승격 전에는 v6.5 백업 파일로 복원 테스트를 반드시 할 것.
