# API Research

## 확인한 국회 API

- 의안 목록: `nzmimeepazxkubdpn`
  - 예: `/portal/openapi/nzmimeepazxkubdpn?Type=xml&pIndex=1&pSize=500&AGE=22`
  - 주요 필드: `BILL_ID`, `BILL_NO`, `BILL_NAME`, `PROPOSER`, `PROPOSE_DT`, `COMMITTEE`, `PROC_RESULT`, `DETAIL_LINK`, `MEMBER_LIST`, `RST_PROPOSER`, `PUBL_PROPOSER`
- 의안 상세 통합 API: `ALLBILL`
  - 예: `/portal/openapi/ALLBILL?Type=xml&pIndex=1&pSize=1&AGE=22&BILL_NO={billNo}`
  - 주요 필드: `BILL_ID`, `BILL_NO`, `BILL_NM`, `PPSR_NM`, `PPSL_DT`, `JRCMIT_NM`, `LAW_PROC_RSLT`, `LINK_URL`
- 공동발의자 HTML 팝업: `MEMBER_LIST`
  - 예: `http://likms.assembly.go.kr/bill/coactorListPopup.do?billId={billId}`
  - HTML 구조: `.member_list_img > li` 안에 의원명, 한자명, 정당, 의원 프로필 URL 포함
- 국회의원 정보 통합 API: `ALLNAMEMBER`
  - 예: `/portal/openapi/ALLNAMEMBER?Type=xml&pIndex=1&pSize=1000`
  - 주요 필드: `NAAS_CD`, `NAAS_NM`, `PLPT_NM`, `ELECD_NM`, `BLNG_CMIT_NM`, `GTELT_ERACO`, `NAAS_HP_URL`, `NAAS_PIC`

## 구현된 PoC

- XML 응답 파싱
- 최근 의안 500건 수집
- `BILL_NO` 기반 상세 조회
- 목록 row와 상세 row 병합
- `Bill.rawData.list`, `Bill.rawData.detail` 원천 보존
- 대표발의자 이름 기반 `Member`, `BillMember`, `BILL_PRIMARY_SPONSORED` 이벤트 생성
- 공동발의자 HTML 기반 `Member`, `BillMember`, `BILL_CO_SPONSORED` 이벤트 생성
- `ALLNAMEMBER` 기반 공식 의원코드, 정당, 지역구, 홈페이지, 사진 URL 보강
- `SyncLog` 성공/실패 기록

## 검증 질문

- `BILL_ID`로 조회하는 별도 상세 API가 있는가?
- 공동발의자 HTML 팝업을 장기적으로 사용해도 되는가, 아니면 공동발의자 별도 API가 있는가?
- `ALLNAMEMBER`의 정당/지역구 이력 문자열을 장기적으로 어떻게 정규화할 것인가?
- 처리상태 변경일과 상태 이력을 별도로 제공하는 API가 있는가?
- 위원회 회부일, 본회의 의결일, 공포일 중 어떤 날짜를 이벤트 발생일로 삼아야 하는가?
- 회의록 발언을 의안 또는 의원과 안정적으로 연결할 수 있는 키가 있는가?
