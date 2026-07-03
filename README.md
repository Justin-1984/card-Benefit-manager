# BenefitManager PWA v7.2.2 Subscriptions Beta

v7.1.6 정상 UI 기준과 v7.2.0 UX Beta를 기반으로 구독 결제 매니저를 추가한 베타 버전입니다.

## 핵심 변경

- 구독 결제 전용 탭 추가
- 구독명, 금액, 통화, 환율, 결제일, 연결 카드, 카테고리 관리
- 월 구독 총액, 7일 내 결제, 연간 환산, 실적 미반영 요약
- 구독 금액을 연결 카드 실적에 중복 없이 반영
- KRW/USD/HKD/AUD 입력 지원
- 구독 데이터는 별도 LocalStorage 키에 저장
- 수동 백업/GitHub 백업 payload에 구독 데이터 포함

## 유지 원칙

- 기존 카드 데이터 저장 키 유지
- 기존 카드/History/GitHub 로직 최대한 유지
- UI와 신규 구독 데이터만 확장
