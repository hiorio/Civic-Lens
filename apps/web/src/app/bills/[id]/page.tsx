import Link from "next/link";
import { notFound } from "next/navigation";

type BillMemberRole = "PRIMARY_SPONSOR" | "CO_SPONSOR";

interface BillDetail {
  id: string;
  externalId: string;
  billNo: string;
  title: string;
  status: string;
  proposedAt: string | null;
  committeeName: string | null;
  detailUrl: string | null;
  createdAt: string;
  updatedAt: string;
  billMembers: Array<{
    id: string;
    role: BillMemberRole;
    member: {
      id: string;
      externalId: string;
      name: string;
      partyName: string | null;
      districtName: string | null;
      profileUrl: string | null;
      photoUrl: string | null;
    };
  }>;
  statusHistories: Array<{
    id: string;
    fromStatus: string | null;
    toStatus: string;
    rawStatus: string | null;
    description: string | null;
    changedAt: string;
  }>;
  activityEvents: Array<{
    id: string;
    type: string;
    title: string;
    summary: string | null;
    url: string | null;
    targetKind: string;
    targetId: string;
    occurredAt: string;
    collectedAt: string;
    member: {
      id: string;
      name: string;
      partyName: string | null;
      districtName: string | null;
    } | null;
  }>;
}

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/v1";

export const dynamic = "force-dynamic";

export default async function BillPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bill = await getBill(id);
  const primarySponsor = bill.billMembers.find(
    (item) => item.role === "PRIMARY_SPONSOR"
  );
  const coSponsors = bill.billMembers.filter(
    (item) => item.role === "CO_SPONSOR"
  );

  return (
    <main className="min-h-screen bg-[#f5f7f6] text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-5 px-5 py-6">
          <Link
            className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-900"
            href="/"
          >
            <span>Civic Lens</span>
            <span aria-hidden="true" className="text-base leading-none">
              👀
            </span>
          </Link>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>{bill.billNo}</span>
                <StatusBadge status={bill.status} />
                <span>{formatDate(bill.proposedAt)}</span>
                {bill.committeeName ? <span>{bill.committeeName}</span> : null}
              </div>
              <h1 className="mt-3 text-2xl font-semibold leading-8 tracking-normal text-slate-950 md:text-4xl md:leading-[1.2]">
                {bill.title}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 md:text-base">
                수집된 국회 의안정보 API 데이터를 Civic Lens 내부 모델로 정리한
                검증 화면입니다. 상태와 참여 의원 정보는 원천 데이터 확보 범위에
                따라 달라질 수 있습니다.
              </p>
            </div>
            {bill.detailUrl ? (
              <a
                className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-md border border-emerald-700 bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800"
                href={bill.detailUrl}
                rel="noreferrer"
                target="_blank"
              >
                국회 원문 보기
              </a>
            ) : null}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-5 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-5">
          <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-slate-950">의안 요약</h2>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="의안 번호" value={bill.billNo} />
              <Field label="처리 상태" value={statusLabel(bill.status)} />
              <Field label="제안일" value={formatDate(bill.proposedAt)} />
              <Field label="소관 위원회" value={bill.committeeName ?? "확인 필요"} />
              <Field
                label="대표발의"
                value={primarySponsor?.member.name ?? "확인 필요"}
              />
              <Field label="공동발의" value={`${coSponsors.length}명`} />
            </dl>
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-slate-950">발의 의원</h2>
            {bill.billMembers.length > 0 ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {bill.billMembers.map((item) => (
                  <article
                    className="rounded-md border border-slate-200 bg-slate-50 p-3"
                    key={item.id}
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-slate-200">
                        {item.member.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            alt=""
                            className="h-full w-full object-cover"
                            src={item.member.photoUrl}
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-slate-950">
                            {item.member.name}
                          </h3>
                          <RoleBadge role={item.role} />
                        </div>
                        <p className="mt-1 text-sm text-slate-600">
                          {item.member.partyName ?? "정당 미확인"} ·{" "}
                          {item.member.districtName ?? "지역구 미확인"}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-600">
                아직 연결된 발의 의원 데이터가 없습니다.
              </p>
            )}
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-slate-950">상태 이력</h2>
            {bill.statusHistories.length > 0 ? (
              <ol className="mt-4">
                {bill.statusHistories.map((history) => (
                  <li
                    className="relative border-l-2 border-slate-200 pb-4 pl-4 last:pb-0"
                    key={history.id}
                  >
                    <span className="absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-600" />
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="inline-flex min-h-6 items-center rounded-full bg-slate-100 px-2 font-medium text-slate-600">
                        {formatDate(history.changedAt)}
                      </span>
                      <StatusBadge status={history.toStatus} />
                    </div>
                    <p className="mt-2 text-sm text-slate-700">
                      원천 상태: {history.rawStatus ?? "확인 필요"}
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-3 text-sm text-slate-600">
                아직 저장된 처리상태 이력이 없습니다.
              </p>
            )}
          </section>
        </section>

        <aside className="space-y-5 lg:sticky lg:top-5 lg:self-start">
          <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-slate-950">수집 정보</h2>
            <dl className="mt-4 space-y-3">
              <Field label="내부 ID" value={bill.id} />
              <Field label="외부 ID" value={bill.externalId} />
              <Field label="최초 저장" value={formatDateTime(bill.createdAt)} />
              <Field label="최근 갱신" value={formatDateTime(bill.updatedAt)} />
            </dl>
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-slate-950">활동 이벤트</h2>
            {bill.activityEvents.length > 0 ? (
              <ol className="mt-4 space-y-3">
                {bill.activityEvents.map((event) => (
                  <li
                    className="rounded-md border border-slate-200 bg-slate-50 p-3"
                    key={event.id}
                  >
                    <p className="text-xs font-medium text-emerald-700">
                      {eventTypeLabel(event.type)}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-950">
                      {event.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDate(event.occurredAt)}
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-3 text-sm text-slate-600">
                아직 연결된 활동 이벤트가 없습니다.
              </p>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}

async function getBill(id: string) {
  const response = await fetch(`${apiBaseUrl}/bills/${encodeURIComponent(id)}`, {
    cache: "no-store"
  });

  if (response.status === 404) {
    notFound();
  }

  if (!response.ok) {
    throw new Error(`Failed to load bill: ${response.status}`);
  }

  return (await response.json()) as BillDetail;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold text-slate-950">
        {value}
      </dd>
    </div>
  );
}

function RoleBadge({ role }: { role: BillMemberRole }) {
  const className =
    role === "PRIMARY_SPONSOR"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : "border-indigo-200 bg-indigo-50 text-indigo-800";

  return (
    <span
      className={`inline-flex min-h-6 items-center rounded-full border px-2 text-xs font-semibold ${className}`}
    >
      {roleLabel(role)}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className="inline-flex min-h-6 items-center rounded-full border border-slate-200 bg-white px-2 text-xs font-medium text-slate-600">
      {statusLabel(status)}
    </span>
  );
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "날짜 미확인";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium"
  }).format(new Date(value));
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "확인 필요";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function roleLabel(role: BillMemberRole) {
  return role === "PRIMARY_SPONSOR" ? "대표발의" : "공동발의";
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    DISCARDED: "폐기",
    PASSED_COMMITTEE: "위원회 통과",
    PASSED_PLENARY: "본회의 통과",
    PROMULGATED: "공포",
    RECEIVED: "접수",
    REFERRED_TO_COMMITTEE: "위원회 회부",
    UNDER_COMMITTEE_REVIEW: "위원회 심사",
    UNKNOWN: "확인 필요",
    WITHDRAWN: "철회"
  };

  return labels[status] ?? status;
}

function eventTypeLabel(type: string) {
  const labels: Record<string, string> = {
    BILL_CO_SPONSORED: "공동발의",
    BILL_DISCARDED_OR_WITHDRAWN: "폐기 또는 철회",
    BILL_PASSED_PLENARY: "본회의 통과",
    BILL_PRIMARY_SPONSORED: "대표발의",
    BILL_REFERRED_TO_COMMITTEE: "위원회 회부",
    BILL_REGISTERED: "새 의안 등록",
    BILL_STATUS_CHANGED: "처리상태 변경",
    MEETING_REMARK_ADDED: "회의록 발언"
  };

  return labels[type] ?? type;
}
