# 카드 혜택매니저 PWA

카드 혜택매니저는 신용카드 실적, 현대카드 기간, RED 연간 실적, M BOOST/M포인트, 월별 기록과 백업을 관리하는 개인용 PWA입니다.

## 현재 버전

- 안정 운영 기준: `v6.5 Stable`
- 최신 UI 테스트: `v7.1.1 UI Beta`
- Data Version: `1.0`

## 주요 기능

- 카드별 월 실적 관리
- 현대카드 실적기간 `24일 ~ 23일` 분리 관리
- 일반카드 월별 실적기간 관리
- RED 연간 목표 1,200만원 관리
- M BOOST 및 M포인트 대시보드
- GitHub Backup / Restore
- 업데이트 전, 리셋 전, 복원 전 자동 백업
- 최근 자동 백업 관리
- 설정 탭 분리
- Mobile / iPad / PC 반응형 UI

## v7.1.1 UI Beta 핵심

- 디자인 시스템 토큰 구축
- 버튼, 카드, 입력창, 패널 스타일 통일
- PC 전용 Sidebar 레이아웃 강화
- iPad 2열 레이아웃 강화
- Mobile Wallet 카드 스택 감각 개선
- Progress Ring 시각 통일
- Glass, Shadow, Radius, Spacing, Animation 기준 정리
- 데이터 및 백업 로직 변경 없음

## 설치

자세한 설치 방법은 [INSTALL.md](./INSTALL.md)를 확인하세요.

## 업데이트 내역

버전별 변경사항은 [CHANGELOG.md](./CHANGELOG.md)를 확인하세요.

## 개발 계획

향후 계획은 [ROADMAP.md](./ROADMAP.md)를 확인하세요.

## 중요 원칙

이 앱에서 가장 중요한 것은 데이터 안정성입니다.

- Stable은 직접 수정하지 않음
- 새 기능은 Beta에서 먼저 테스트
- 정상 확인 후 Stable 승격
- 데이터 구조 변경 최소화
- GitHub Backup 호환성 유지
