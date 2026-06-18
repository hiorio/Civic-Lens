# Civic Lens

Civic Lens는 국회 공개 데이터를 시민의 관심 단위로 재구성해 의안, 의원, 지역구, 관심 키워드의 변화를 추적하는 서비스입니다.

이번 저장소는 전체 서비스를 구현하기보다, 향후 확장 가능한 개발환경과 국회 의안정보 API 수집 PoC를 위한 Turborepo 기반 모노레포 골격을 제공합니다.

## 기술 스택

- Monorepo: Turborepo, pnpm
- Web: Next.js, React, TypeScript, Tailwind CSS
- API: NestJS, TypeScript
- XML parsing: fast-xml-parser
- Database: PostgreSQL
- ORM: Prisma
- Local infra: Docker Compose

## 디렉토리 구조

```text
apps/
  web/       Next.js 웹 앱
  api/       NestJS API 서버
packages/
  types/     공통 TypeScript 계약
  utils/     환경 의존성이 없는 공통 유틸
docs/
  architecture.md
  data-source-checklist.md
  bill-status-dictionary.md
  api-research.md
  development-plan.md
infra/
  docker-compose.yml
```

## 환경변수

`.env.example`을 복사해 `.env`를 만듭니다.

```bash
DATABASE_URL="postgresql://civic_lens:civic_lens@localhost:5432/civic_lens?schema=public"
NATIONAL_ASSEMBLY_API_BASE_URL="https://open.assembly.go.kr/portal/openapi"
NATIONAL_ASSEMBLY_AGE="22"
NATIONAL_ASSEMBLY_API_KEY=""
API_PREFIX="v1"
WEB_ORIGIN="http://localhost:3000,http://127.0.0.1:3000"
PORT=4000
NEXT_PUBLIC_API_BASE_URL="http://localhost:4000/v1"
```

실제 국회 API 키는 커밋하지 않습니다.

## 로컬 실행

```bash
corepack enable
pnpm install
cp .env.example .env
```

If the local machine cannot create the global pnpm shim, use `corepack pnpm ...` instead of `pnpm ...`. The root Turborepo scripts include a small local wrapper so Turbo can still resolve pnpm during `lint`, `typecheck`, `build`, and `dev`.

Windows PowerShell에서는 다음처럼 실행할 수 있습니다.

```powershell
Copy-Item .env.example .env
pnpm.cmd install
```

## Docker Compose

```bash
docker compose -f infra/docker-compose.yml up -d postgres
```

로컬 개발 DB 기본값:

- DB: `civic_lens`
- User: `civic_lens`
- Password: `civic_lens`
- Port: `5432`

DB 연결 상태만 빠르게 확인하려면 다음 명령을 사용합니다.

```bash
pnpm db:check
```

`Docker CLI: not found in PATH`가 표시되면 현재 PC에 Docker Desktop 또는 Docker CLI가 설치되어 있지 않거나 PATH에 등록되지 않은 상태입니다.

## Prisma

```bash
pnpm db:generate
pnpm db:push
```

마이그레이션을 생성해야 하는 단계에서는 다음 명령을 사용합니다.

```bash
pnpm db:migrate
```

## 앱 실행

웹 앱:

```bash
pnpm --filter @civic-lens/web dev
```

API 서버:

```bash
pnpm --filter @civic-lens/api dev
```

전체 개발 서버:

```bash
pnpm dev
```

기본 포트:

- Web: `http://localhost:3000`
- API: `http://localhost:4000/v1`

## 구현된 API

- `GET /v1/health`
  - 예: `{ "status": "ok", "service": "civic-lens-api" }`
- `GET /v1/health/db`
  - PostgreSQL 연결 가능 여부를 확인합니다.
- `GET /v1/bills`
  - 최근 저장된 의안 500건을 조회합니다.
- `GET /v1/bills/:id`
  - 내부 `id`, `billNo`, `externalId` 중 하나로 의안을 조회합니다.
- `GET /v1/members`
  - 공식 의원코드가 반영된 22대 의원 목록을 조회합니다.
- `GET /v1/members/:id`
  - 내부 `id`, 공식 `externalId`, 의원명 중 하나로 의원을 조회합니다.
- `GET /v1/sync-logs`
  - 최근 외부 API 동기화 기록을 조회합니다.
- `GET /v1/external-api/national-assembly/bills/poc?limit=500`
  - 국회 의안정보 API 수집 PoC를 실행합니다.
  - 기본값으로 목록, 상세, 공동발의자 HTML 페이지를 함께 수집합니다.
  - `limit` 기본값은 500건이며, 안전 상한은 1000건입니다.
- `GET /v1/external-api/national-assembly/members/poc`
  - 국회의원 정보 통합 API로 22대 의원 정보를 동기화합니다.

## 웹 대시보드

`apps/web`의 홈 화면은 지도 기반 첫 경험과 MVP 1 수준의 읽기 전용 대시보드를 함께 제공합니다.

첫 화면:

- KOSTAT 2013 GeoJSON 기반 전국 시/도 단위 클릭/터치 지도
- 시/도 선택 후 지역구와 현역 의원 목록 표시
- 지역구 선택 시 오른쪽 패널에 의원 정보와 최근 의안 활동 표시
- 아직 선거구 경계는 아니며, 다음 단계에서 선관위/국회 기반 선거구 GeoJSON 또는 TopoJSON 확보가 필요합니다.

데이터 탐색 섹션:

- 최근 의안 목록과 대표발의자, 공동발의자 수
- 22대 의원 목록과 최근 관련 의안
- 선택한 의안의 처리 상태 이력과 최근 ActivityEvent
- 선택한 의원의 관련 의안과 최근 ActivityEvent
- 의안 상세의 발의 의원과 의원 상세의 관련 의안을 눌러 연관 항목으로 이동
- 의안/의원 동기화 로그
- API health check

## 의안 수집 PoC

`.env`에 `DATABASE_URL`과 `NATIONAL_ASSEMBLY_API_KEY`를 설정한 뒤 실행합니다.

```bash
pnpm sync:bills -- --limit=500
```

상세 조회를 생략하려면 다음 옵션을 사용합니다.

```bash
pnpm sync:bills -- --limit=500 --skip-details
```

공동발의자 HTML 페이지 수집을 생략하려면 다음 옵션을 사용합니다.

```bash
pnpm sync:bills -- --limit=500 --skip-coactors
```

현재 확인한 국회 API:

- 목록: `https://open.assembly.go.kr/portal/openapi/nzmimeepazxkubdpn?Type=xml&pIndex=1&pSize=500&AGE=22`
- 상세: `https://open.assembly.go.kr/portal/openapi/ALLBILL?Type=xml&pIndex=1&pSize=1&AGE=22&BILL_NO={billNo}`
- 공동발의자: 목록 응답의 `MEMBER_LIST` URL, 예: `http://likms.assembly.go.kr/bill/coactorListPopup.do?billId={billId}`

수집 결과는 `Bill`, `Member`, `BillMember`, `BillStatusHistory`, `ActivityEvent`, `SyncLog`에 저장됩니다. 원천 XML row는 추적성을 위해 `Bill.rawData.list`, `Bill.rawData.detail`, `ActivityEvent.rawData`, `BillStatusHistory.rawData`에 보관합니다. 공동발의자 HTML에서 추출한 의원 이름, 정당, 프로필 URL은 공동발의 이벤트의 `rawData.coactor`에 보존합니다. HTML 구조가 바뀔 수 있으므로 이 파서는 PoC용이며, 실패 수는 `SyncLog.metadata.coactorListFailedCount`에 기록합니다.

## 의원 정보 동기화

공식 의원 코드, 정당, 지역구, 홈페이지, 사진 URL을 보강하려면 다음을 실행합니다.

```bash
pnpm sync:members
```

현재 확인한 국회 API:

- 의원 정보 통합 API: `https://open.assembly.go.kr/portal/openapi/ALLNAMEMBER?Type=xml&pIndex=1&pSize=1000`

`ALLNAMEMBER`는 역대 의원을 함께 제공하므로 `GTELT_ERACO`에 `제22대`가 포함된 row만 현재 의원으로 저장합니다. `PLPT_NM`, `ELECD_NM`처럼 과거 이력이 `/`로 함께 제공되는 필드는 마지막 값을 현재 표시값으로 저장하고, 전체 원천 row는 `Member.rawData`에 보존합니다.

## 품질 확인

```bash
pnpm lint
pnpm typecheck
pnpm build
```

## 1단계 공개 데모 배포

권장 조합은 Vercel Web + Railway API/PostgreSQL입니다.

- Web: `apps/web`, Vercel
- API: `apps/api`, Railway
- DB: Railway PostgreSQL
- API prefix: `/v1`
- 향후 모바일 앱: `apps/mobile`에 Expo + React Native 추가

자세한 배포 체크리스트는 `docs/deployment-phase-1.md`를 참고합니다.

## 다음 작업

- 공동발의자 HTML 파싱 결과를 장기적으로 안정화할 별도 API 존재 여부 확인
- 처리상태 변경일과 상태 이력 전용 API 확인
- 읽기 전용 웹에서 의안 목록, 대표발의자, 공동발의자 표시
- 정기 수집 스케줄과 재시도 정책 구현
