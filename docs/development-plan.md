# Development Plan

## MVP 0: 데이터 수집 PoC

- 국회 의안정보 API 최근 의안 100건 수집
- 목록/상세 XML 응답 파싱
- `Bill`, `Member`, `BillMember`, `BillStatusHistory`, `ActivityEvent`, `SyncLog` 저장 검증
- 대표발의/공동발의 관계 저장 검증
- `ALLNAMEMBER` 기반 공식 의원코드와 의원 프로필 보강
- 원천 필드와 내부 모델 매핑 문서화
- 처리상태 사전 초안 작성

## MVP 1: 읽기 전용 웹

- 의안 목록과 상세 화면
- 대표발의/공동발의 의원 표시
- 처리상태 사용자 표시 문구 정리
- API 서버 health check 표시 유지

## MVP 2: 관심 피드

- 사용자 관심 대상 저장 구조 구현
- 의원 팔로우부터 시작
- `ActivityEvent` 기반 관심 피드 API 구현

## MVP 3: 지역구 기반 탐색

- 지역구 검색
- 지역구 소속 의원과 관련 의안 탐색
- 지도 UI는 후보 검토만 하고 MVP 3 이전에는 구현하지 않음

## MVP 4: 알림/시각화/회의록/법령 연계

- 알림 채널 설계
- 처리상태 변화 시각화
- 회의록 발언 연계
- 법령 데이터 연계 가능성 검토
