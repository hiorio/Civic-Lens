# Data Source Checklist

| 필요한 데이터 | 출처 API | 확보 가능 여부 | 원천 필드명 | 내부 필드명 | 문제점 | 대안 |
| --- | --- | --- | --- | --- | --- | --- |
| 의안 기본 정보 | 목록 `nzmimeepazxkubdpn`, 상세 `ALLBILL` | PoC 확인 | 목록 `BILL_NO`, `BILL_ID`, `BILL_NAME`; 상세 `BILL_NO`, `BILL_ID`, `BILL_NM` | `Bill.billNo`, `Bill.externalId`, `Bill.title` | 목록은 `AGE`, 상세는 `AGE`와 `BILL_NO` 필요 | `NATIONAL_ASSEMBLY_AGE` 환경변수로 관리 |
| 의안 상세 링크 | 목록 `nzmimeepazxkubdpn`, 상세 `ALLBILL` | PoC 확인 | `DETAIL_LINK`, `LINK_URL` | `Bill.detailUrl` | 링크 도메인이 국회 의안정보 페이지로 제공됨 | 원천 URL을 그대로 보존 |
| 의안 제안일 | 목록 `nzmimeepazxkubdpn`, 상세 `ALLBILL` | PoC 확인 | `PROPOSE_DT`, `PPSL_DT` | `Bill.proposedAt`, `ActivityEvent.occurredAt` | 날짜 형식이 `YYYY-MM-DD` 또는 `YYYYMMDD`일 수 있음 | 정규화 함수에서 둘 다 허용 |
| 의안 처리상태 | 목록 `nzmimeepazxkubdpn`, 상세 `ALLBILL` | 부분 확인 | `PROC_RESULT`, `LAW_PROC_RSLT`, `JRCMIT_PROC_RSLT`, `RGS_CONF_RSLT` | `Bill.status`, `BillStatusHistory.toStatus` | 최근 의안은 빈 값이 많음 | 빈 값은 `UNKNOWN`, 원천 문자열은 이력에 보존 |
| 소관 위원회 | 목록 `nzmimeepazxkubdpn`, 상세 `ALLBILL` | PoC 확인 | `COMMITTEE`, `JRCMIT_NM` | `Bill.committeeName` | 최근 의안은 빈 값일 수 있음 | 위원회 회부 이후 재수집으로 갱신 |
| 대표발의 의원 | 목록 `nzmimeepazxkubdpn`, 상세 `ALLBILL` | PoC 구현 | `RST_PROPOSER`, `PROPOSER`, `PPSR_NM` | `Member`, `BillMember(role=PRIMARY_SPONSOR)`, `ActivityEvent(type=BILL_PRIMARY_SPONSORED)` | 현재는 이름 기반 임시 externalId 사용 | 의원 고유 코드 API 확인 후 보강 |
| 공동발의 의원 | 의안 목록의 `MEMBER_LIST` 링크 | PoC 구현 | HTML `.member_list_img` 내부 의원명, 정당, 프로필 URL | `Member`, `BillMember(role=CO_SPONSOR)`, `ActivityEvent(type=BILL_CO_SPONSORED)` | HTML 구조 변경에 취약할 수 있음 | 별도 API 존재 여부 조사, 실패 카운트는 `SyncLog.metadata.coactorListFailedCount`에 기록 |
| 의원 기본 정보 | `ALLNAMEMBER` | PoC 구현 | `NAAS_CD`, `NAAS_NM`, `PLPT_NM`, `ELECD_NM`, `BLNG_CMIT_NM`, `NAAS_HP_URL`, `NAAS_PIC`, `GTELT_ERACO` | `Member.externalId`, `Member.name`, `Member.partyName`, `Member.districtName`, `Member.profileUrl`, `Member.photoUrl`, `Member.rawData` | 역대 의원이 함께 내려오며 정당/지역구에 과거 이력이 `/`로 포함될 수 있음 | `GTELT_ERACO`에 `제22대` 포함 row만 저장, 표시값은 마지막 `/` 구간 사용 |
| 지역구 정보 | `ALLNAMEMBER` 또는 선관위/국회 공개 데이터 | 부분 확인 | `ELECD_NM`, `ELECD_DIV_NM` | `Member.districtName`, 향후 `District` | 행정구역 변경 이력과 선거구 경계 정보는 별도 관리 필요 | 우선 의원 표시용 문자열로 저장, District 정규화는 별도 단계 |
| 시·도 경계 지도 | `southkorea/southkorea-maps` KOSTAT 2013 GeoJSON | PoC 적용 | `properties.name`, `geometry` | `RegionSummary.id`, SVG path | 2013 행정구역 기준이라 최신 선거구 경계와 다름 | 선거구 GeoJSON/TopoJSON 확보 후 `District` 경계로 전환 |
| 위원회 회부/처리 이력 | 의안 상세 또는 처리 이력 API | 확인 필요 | 미확인 | `ActivityEvent`, `BillStatusHistory` | 변경일과 상태명이 별도 이력으로 필요한지 확인 필요 | 처리 이력 API 조사 |
| 회의록 발언 | 국회 회의록 API | 확인 필요 | 미확인 | `ActivityEvent(type=MEETING_REMARK_ADDED)` | 의안/의원 연결 규칙 필요 | 키워드 기반 후보 매칭 후 검증 |
| 원천 응답 보존 | 목록 `nzmimeepazxkubdpn`, 상세 `ALLBILL`, `MEMBER_LIST` HTML | PoC 구현 | 전체 XML row, 공동발의자 HTML 추출 row | `Bill.rawData.list`, `Bill.rawData.detail`, `ActivityEvent.rawData`, `BillStatusHistory.rawData` | 불필요한 필드가 커질 수 있음 | 저장 필드 allowlist 검토 |
| 수집 실행 이력 | 내부 수집 작업 | PoC 구현 | 실행 메타데이터 | `SyncLog` | 재시도 정책 미정 | SchedulerModule에서 확장 |
