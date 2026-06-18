"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import provincesGeoJson from "../data/skorea-provinces.geo.json";
import { CivicDashboard } from "./civic-dashboard";

type BillMemberRole = "PRIMARY_SPONSOR" | "CO_SPONSOR";
type LoadState = "idle" | "loading" | "ready" | "error";

interface MemberListItem {
  id: string;
  externalId: string;
  name: string;
  partyName: string | null;
  districtName: string | null;
  profileUrl: string | null;
  photoUrl: string | null;
  billMembers: Array<{
    role: BillMemberRole;
    bill: {
      id: string;
      billNo: string;
      detailUrl: string | null;
      title: string;
      proposedAt: string | null;
      status: string;
    };
  }>;
}

interface RegionDefinition {
  id: string;
  label: string;
  shortLabel: string;
  x: number;
  y: number;
}

interface RegionSummary extends RegionDefinition {
  memberCount: number;
  members: MemberListItem[];
  districtCount: number;
  recentPrimaryBillCount: number;
  recentCoSponsoredBillCount: number;
}

interface ActivityListItem {
  billId: string;
  billNo: string;
  detailUrl: string | null;
  title: string;
  role: BillMemberRole;
  proposedAt: string | null;
  status: string;
}

type GeoPosition = [number, number];
type GeoLinearRing = GeoPosition[];
type GeoPolygonCoordinates = GeoLinearRing[];
type GeoMultiPolygonCoordinates = GeoPolygonCoordinates[];

type ProvinceGeometry =
  | { type: "Polygon"; coordinates: GeoPolygonCoordinates }
  | { type: "MultiPolygon"; coordinates: GeoMultiPolygonCoordinates };

interface ProvinceFeature {
  type: "Feature";
  properties: {
    code: string;
    name: string;
    name_eng: string;
    base_year: string;
  };
  geometry: ProvinceGeometry;
}

interface ProvinceFeatureCollection {
  type: "FeatureCollection";
  features: ProvinceFeature[];
}

interface ProjectedProvince {
  regionId: string;
  label: string;
  path: string;
  centerX: number;
  centerY: number;
}

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/v1";

const mapViewport = { width: 520, height: 720 };

const provinceLabelPositionOverrides: Record<
  string,
  { centerX: number; centerY: number }
> = {
  인천: { centerX: 145, centerY: 166 },
  충북: { centerX: 286, centerY: 279 },
  전남: { centerX: 166, centerY: 509 },
  경북: { centerX: 395, centerY: 292 }
};

const provinceNameToRegionId: Record<string, string> = {
  강원도: "강원",
  경기도: "경기",
  경상남도: "경남",
  경상북도: "경북",
  광주광역시: "광주",
  대구광역시: "대구",
  대전광역시: "대전",
  부산광역시: "부산",
  서울특별시: "서울",
  세종특별자치시: "세종",
  울산광역시: "울산",
  인천광역시: "인천",
  전라남도: "전남",
  전라북도: "전북",
  제주특별자치도: "제주",
  충청남도: "충남",
  충청북도: "충북"
};

const projectedProvinces = projectProvinceFeatures(
  provincesGeoJson as ProvinceFeatureCollection
);

const regions: RegionDefinition[] = [
  {
    id: "서울",
    label: "서울특별시",
    shortLabel: "서울",
    x: 34,
    y: 22
  },
  {
    id: "인천",
    label: "인천광역시",
    shortLabel: "인천",
    x: 24,
    y: 25
  },
  {
    id: "경기",
    label: "경기도",
    shortLabel: "경기",
    x: 41,
    y: 30
  },
  {
    id: "강원",
    label: "강원특별자치도",
    shortLabel: "강원",
    x: 62,
    y: 20
  },
  {
    id: "충북",
    label: "충청북도",
    shortLabel: "충북",
    x: 51,
    y: 41
  },
  {
    id: "충남",
    label: "충청남도",
    shortLabel: "충남",
    x: 30,
    y: 43
  },
  {
    id: "세종",
    label: "세종특별자치시",
    shortLabel: "세종",
    x: 42,
    y: 47
  },
  {
    id: "대전",
    label: "대전광역시",
    shortLabel: "대전",
    x: 41,
    y: 53
  },
  {
    id: "경북",
    label: "경상북도",
    shortLabel: "경북",
    x: 65,
    y: 51
  },
  {
    id: "대구",
    label: "대구광역시",
    shortLabel: "대구",
    x: 61,
    y: 62
  },
  {
    id: "전북",
    label: "전북특별자치도",
    shortLabel: "전북",
    x: 37,
    y: 64
  },
  {
    id: "광주",
    label: "광주광역시",
    shortLabel: "광주",
    x: 31,
    y: 75
  },
  {
    id: "전남",
    label: "전라남도",
    shortLabel: "전남",
    x: 32,
    y: 84
  },
  {
    id: "경남",
    label: "경상남도",
    shortLabel: "경남",
    x: 57,
    y: 76
  },
  {
    id: "울산",
    label: "울산광역시",
    shortLabel: "울산",
    x: 76,
    y: 70
  },
  {
    id: "부산",
    label: "부산광역시",
    shortLabel: "부산",
    x: 70,
    y: 82
  },
  {
    id: "제주",
    label: "제주특별자치도",
    shortLabel: "제주",
    x: 31,
    y: 95
  }
];

export function MapFirstHome() {
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [members, setMembers] = useState<MemberListItem[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState("서울");
  const [hoveredRegionId, setHoveredRegionId] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [pendingDistrictName, setPendingDistrictName] = useState<string | null>(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const regionId = searchParams.get("region");
    const districtName = searchParams.get("district");

    if (regionId && regions.some((region) => region.id === regionId)) {
      setSelectedRegionId(regionId);
    }

    if (districtName) {
      setPendingDistrictName(districtName);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadMembers() {
      setLoadState("loading");

      try {
        const response = await fetch(`${apiBaseUrl}/members`);

        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`);
        }

        const items = (await response.json()) as MemberListItem[];

        if (!isMounted) {
          return;
        }

        setMembers(items.filter((member) => member.districtName !== "비례대표"));
        setLoadState("ready");
      } catch {
        if (isMounted) {
          setLoadState("error");
        }
      }
    }

    void loadMembers();

    return () => {
      isMounted = false;
    };
  }, []);

  const regionSummaries = useMemo(
    () => createRegionSummaries(members),
    [members]
  );
  const selectedRegion = regionSummaries.find(
    (region) => region.id === selectedRegionId
  );
  const hoveredRegion = hoveredRegionId
    ? regionSummaries.find((region) => region.id === hoveredRegionId)
    : null;
  const selectedMember =
    selectedRegion?.members.find((member) => member.id === selectedMemberId) ??
    selectedRegion?.members[0] ??
    null;
  const selectedActivities = useMemo(
    () => (selectedMember ? createMemberActivities(selectedMember) : []),
    [selectedMember]
  );

  useEffect(() => {
    if (!selectedRegion) {
      setSelectedMemberId(null);
      return;
    }

    if (pendingDistrictName) {
      const pendingMember = selectedRegion.members.find(
        (member) => member.districtName === pendingDistrictName
      );

      if (pendingMember) {
        setSelectedMemberId(pendingMember.id);
        setPendingDistrictName(null);
        return;
      }
    }

    if (!selectedRegion.members.some((member) => member.id === selectedMemberId)) {
      setSelectedMemberId(selectedRegion.members[0]?.id ?? null);
    }
  }, [pendingDistrictName, selectedMemberId, selectedRegion]);

  useEffect(() => {
    if (!selectedRegion) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    params.set("region", selectedRegion.id);

    if (selectedMember?.districtName) {
      params.set("district", selectedMember.districtName);
    } else {
      params.delete("district");
    }

    window.history.replaceState(null, "", `?${params.toString()}`);
  }, [selectedMember, selectedRegion]);

  return (
    <main className="min-h-screen bg-[#f5f7f6] text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-6 px-5 py-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <div className="flex max-w-3xl flex-col gap-3">
            <p className="text-sm font-semibold text-emerald-700">Civic Lens</p>
            <h1 className="text-4xl font-semibold leading-[1.18] tracking-normal text-slate-950 md:text-6xl md:leading-[1.16]">
              내가 사는 곳의 국회 일,
              <br />
              가볍게 짚어보세요.
            </h1>
            <p className="text-base leading-7 text-slate-600 md:text-lg">
              지도를 누르면 지역구와 의원이 먼저 보입니다. 복잡한 검색 없이,
              우리 동네에서 올라온 의안 활동부터 천천히 따라갈 수 있게 만들고 있습니다.
            </p>
          </div>
          <ol className="grid gap-2 text-sm text-slate-700">
            <li className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
              1. 시·도를 고릅니다
            </li>
            <li className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
              2. 지역구를 선택합니다
            </li>
            <li className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
              3. 최근 의안 활동을 봅니다
            </li>
          </ol>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0">
          <div className="grid gap-5 lg:grid-cols-[minmax(340px,0.9fr)_minmax(280px,0.8fr)]">
            <KoreaRegionMap
              hoveredRegion={hoveredRegion ?? null}
              loadState={loadState}
              onHoverRegion={setHoveredRegionId}
              onSelectRegion={(regionId) => {
                setSelectedRegionId(regionId);
                setSelectedMemberId(null);
              }}
              regions={regionSummaries}
              selectedRegionId={selectedRegion?.id ?? null}
            />
            <DistrictPicker
              loadState={loadState}
              onSelectMember={setSelectedMemberId}
              region={selectedRegion}
              selectedMemberId={selectedMember?.id ?? null}
            />
          </div>
        </div>

        <DistrictActivityPanel
          activities={selectedActivities}
          loadState={loadState}
          member={selectedMember}
          region={selectedRegion}
        />
      </section>

      <section className="border-t border-slate-200 bg-slate-50 px-5 py-6">
        <details className="mx-auto max-w-7xl rounded-md border border-slate-200 bg-white" open>
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-900">
            전체 의안 데이터와 수집 상태 보기
          </summary>
          <div className="border-t border-slate-200">
            <CivicDashboard />
          </div>
        </details>
      </section>
    </main>
  );
}

function KoreaRegionMap({
  hoveredRegion,
  loadState,
  onHoverRegion,
  onSelectRegion,
  regions,
  selectedRegionId
}: {
  hoveredRegion: RegionSummary | null;
  loadState: LoadState;
  onHoverRegion: (regionId: string | null) => void;
  onSelectRegion: (regionId: string) => void;
  regions: RegionSummary[];
  selectedRegionId: string | null;
}) {
  const activeRegion =
    hoveredRegion ?? regions.find((region) => region.id === selectedRegionId) ?? null;

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <div>
          <h2 className="text-base font-semibold text-slate-950">
            1. 시·도를 고릅니다
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            지도나 아래 버튼을 누르면 해당 시·도의 지역구 목록이 열립니다.
          </p>
        </div>
      </div>

      <div className="relative mt-5 overflow-hidden rounded-md border border-slate-200 bg-[#eef3f0] p-3">
        <svg
          aria-label="대한민국 시도 경계 선택 지도"
          className="h-auto w-full"
          role="img"
          viewBox={`0 0 ${mapViewport.width} ${mapViewport.height}`}
        >
          <rect fill="#eef3f0" height={mapViewport.height} rx="18" width={mapViewport.width} />
          <defs>
            <filter
              colorInterpolationFilters="sRGB"
              height="130%"
              id="selected-region-shadow"
              width="130%"
              x="-15%"
              y="-15%"
            >
              <feDropShadow
                dx="0"
                dy="5"
                floodColor="#047857"
                floodOpacity="0.22"
                stdDeviation="4"
              />
            </filter>
          </defs>
          {projectedProvinces.map((province) => {
            const region = regions.find((item) => item.id === province.regionId);

            if (!region) {
              return null;
            }

            const isActive = selectedRegionId === region.id;
            const isHovered = hoveredRegion?.id === region.id;
            const isEmpty = loadState === "ready" && region.memberCount === 0;
            const fill = isActive
              ? "#047857"
              : isHovered
                ? "#a7f3d0"
                : "#ffffff";
            const stroke = isActive || isHovered ? "#047857" : "#94a3b8";

            return (
              <path
                aria-label={`${region.label}, 의원 ${region.memberCount}명`}
                className={[
                  "cursor-pointer outline-none transition",
                  isEmpty ? "pointer-events-none opacity-45" : ""
                ].join(" ")}
                d={province.path}
                fill={fill}
                fillRule="evenodd"
                filter={isActive ? "url(#selected-region-shadow)" : undefined}
                key={province.regionId}
                onClick={() => {
                  if (loadState !== "loading" && !isEmpty) {
                    onSelectRegion(region.id);
                  }
                }}
                onMouseEnter={() => onHoverRegion(region.id)}
                onMouseLeave={() => onHoverRegion(null)}
                role="button"
                stroke={stroke}
                strokeLinejoin="round"
                strokeWidth={isActive ? 2.8 : 1.25}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
          {projectedProvinces.map((province) => {
            const region = regions.find((item) => item.id === province.regionId);

            if (!region) {
              return null;
            }

            const isActive = selectedRegionId === region.id;
            const labelPosition =
              provinceLabelPositionOverrides[province.regionId] ?? province;

            return (
              <text
                fill={isActive ? "#ffffff" : "#475569"}
                fontSize="13"
                fontWeight="700"
                key={`label-${province.regionId}`}
                paintOrder="stroke"
                pointerEvents="none"
                stroke={isActive ? "#047857" : "#ffffff"}
                strokeWidth="3"
                textAnchor="middle"
                x={labelPosition.centerX}
                y={labelPosition.centerY}
              >
                {region.shortLabel}
              </text>
            );
          })}
        </svg>
      </div>

      <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-medium text-slate-500">
          {activeRegion ? "선택한 지역" : "지역 선택"}
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-950">
          {activeRegion
            ? `${activeRegion.label} · 지역구 ${activeRegion.districtCount}개 · 최근 의안 활동 ${activeRegion.recentPrimaryBillCount + activeRegion.recentCoSponsoredBillCount}건`
            : "지도에서 시·도를 누르면 지역구와 의원 활동을 볼 수 있습니다."}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {regions.map((region) => {
          const isActive = region.id === selectedRegionId;
          const isEmpty = loadState === "ready" && region.memberCount === 0;

          return (
            <button
              className={[
                "min-h-10 rounded-md border px-2 text-sm font-medium transition",
                isActive
                  ? "border-emerald-700 bg-emerald-700 text-white shadow-sm ring-2 ring-emerald-100"
                  : "border-slate-200 bg-white text-slate-700 hover:border-emerald-700 hover:bg-emerald-50",
                isEmpty ? "cursor-not-allowed opacity-45" : ""
              ].join(" ")}
              disabled={loadState === "loading" || isEmpty}
              key={region.id}
              onClick={() => onSelectRegion(region.id)}
              type="button"
            >
              {region.shortLabel}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function projectProvinceFeatures(
  collection: ProvinceFeatureCollection
): ProjectedProvince[] {
  const allPositions = collection.features.flatMap((feature) =>
    getGeometryPositions(feature.geometry)
  );
  const visiblePositions = allPositions.filter(
    ([longitude, latitude]) =>
      longitude >= 125.5 && longitude <= 130.2 && latitude >= 33 && latitude <= 39
  );
  const bounds = getBounds(
    visiblePositions.length > 0 ? visiblePositions : allPositions
  );
  const project = createProjection(bounds);

  return collection.features
    .map((feature) => {
      const regionId = provinceNameToRegionId[feature.properties.name];

      if (!regionId) {
        return null;
      }

      const projectedPositions = getGeometryPositions(feature.geometry).map(project);
      const projectedBounds = getProjectedBounds(projectedPositions);

      return {
        centerX: (projectedBounds.minX + projectedBounds.maxX) / 2,
        centerY: (projectedBounds.minY + projectedBounds.maxY) / 2,
        label: feature.properties.name,
        path: geometryToSvgPath(feature.geometry, project),
        regionId
      } satisfies ProjectedProvince;
    })
    .filter((item): item is ProjectedProvince => item !== null);
}

function getGeometryPositions(geometry: ProvinceGeometry): GeoPosition[] {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;

  return polygons.flatMap((polygon) => polygon.flatMap((ring) => ring));
}

function getBounds(positions: GeoPosition[]) {
  return positions.reduce(
    (bounds, [longitude, latitude]) => ({
      maxLatitude: Math.max(bounds.maxLatitude, latitude),
      maxLongitude: Math.max(bounds.maxLongitude, longitude),
      minLatitude: Math.min(bounds.minLatitude, latitude),
      minLongitude: Math.min(bounds.minLongitude, longitude)
    }),
    {
      maxLatitude: Number.NEGATIVE_INFINITY,
      maxLongitude: Number.NEGATIVE_INFINITY,
      minLatitude: Number.POSITIVE_INFINITY,
      minLongitude: Number.POSITIVE_INFINITY
    }
  );
}

function createProjection(bounds: ReturnType<typeof getBounds>) {
  const padding = 20;
  const longitudeSpan = bounds.maxLongitude - bounds.minLongitude || 1;
  const latitudeSpan = bounds.maxLatitude - bounds.minLatitude || 1;
  const scale = Math.min(
    (mapViewport.width - padding * 2) / longitudeSpan,
    (mapViewport.height - padding * 2) / latitudeSpan
  );
  const renderedWidth = longitudeSpan * scale;
  const renderedHeight = latitudeSpan * scale;
  const offsetX = (mapViewport.width - renderedWidth) / 2;
  const offsetY = (mapViewport.height - renderedHeight) / 2;

  return ([longitude, latitude]: GeoPosition) => ({
    x: offsetX + (longitude - bounds.minLongitude) * scale,
    y: offsetY + (bounds.maxLatitude - latitude) * scale
  });
}

function getProjectedBounds(positions: Array<{ x: number; y: number }>) {
  return positions.reduce(
    (bounds, position) => ({
      maxX: Math.max(bounds.maxX, position.x),
      maxY: Math.max(bounds.maxY, position.y),
      minX: Math.min(bounds.minX, position.x),
      minY: Math.min(bounds.minY, position.y)
    }),
    {
      maxX: Number.NEGATIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY
    }
  );
}

function geometryToSvgPath(
  geometry: ProvinceGeometry,
  project: (position: GeoPosition) => { x: number; y: number }
) {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;

  return polygons
    .map((polygon) =>
      polygon
        .map((ring) =>
          ring
            .map((position, index) => {
              const projected = project(position);
              const command = index === 0 ? "M" : "L";

              return `${command}${projected.x.toFixed(2)} ${projected.y.toFixed(2)}`;
            })
            .join(" ") + " Z"
        )
        .join(" ")
    )
    .join(" ");
}

function DistrictPicker({
  loadState,
  onSelectMember,
  region,
  selectedMemberId
}: {
  loadState: LoadState;
  onSelectMember: (memberId: string) => void;
  region: RegionSummary | undefined;
  selectedMemberId: string | null;
}) {
  if (loadState === "loading") {
    return <PanelMessage title="지역구" text="의원 데이터를 불러오고 있습니다." />;
  }

  if (loadState === "error") {
    return <PanelMessage title="지역구" text="API 서버와 잠시 연결되지 않았습니다." />;
  }

  if (!region) {
    return <PanelMessage title="지역구" text="아직 선택할 수 있는 지역 데이터가 없습니다." />;
  }

  return (
    <section className="flex min-h-0 flex-col rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-emerald-700">2. 지역구 선택</p>
          <h2 className="mt-1 text-base font-semibold text-slate-950">
            {region.label}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            살고 있는 지역구를 누르면 오른쪽에 의원과 최근 의안 활동이 표시됩니다.
          </p>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2">
        <MiniStat label="지역구" value={`${region.districtCount}개`} />
        <MiniStat label="의원" value={`${region.memberCount}명`} />
        <MiniStat
          label="최근 의안"
          value={`${region.recentPrimaryBillCount + region.recentCoSponsoredBillCount}건`}
        />
      </dl>

      <div className="mt-4 min-h-0 flex-1 overflow-hidden rounded-md border border-slate-200 bg-slate-50 p-2">
        <div className="h-full space-y-2 overflow-y-auto pr-1">
          {region.members.map((member) => {
            const hasRecentActivity = member.billMembers.length > 0;

            return (
              <button
                className={[
                  "w-full rounded-md border p-3 text-left transition",
                  selectedMemberId === member.id
                    ? "border-emerald-700 bg-emerald-50 shadow-sm"
                    : "border-slate-200 bg-white hover:border-emerald-700 hover:bg-emerald-50"
                ].join(" ")}
                key={member.id}
                onClick={() => onSelectMember(member.id)}
                type="button"
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="block text-sm font-semibold text-slate-950">
                    {member.districtName}
                  </span>
                  <span
                    className={[
                      "shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                      hasRecentActivity
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-slate-200 bg-slate-50 text-slate-500"
                    ].join(" ")}
                  >
                    {hasRecentActivity ? "활동 있음" : "수집 대기"}
                  </span>
                </span>
                <span className="mt-1 block text-sm text-slate-600">
                  {member.name} · {member.partyName ?? "정당 미확인"}
                </span>
                <span className="mt-2 flex flex-wrap gap-1 text-xs text-slate-500">
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-medium text-emerald-800">
                    대표 {countBillsByRole(member, "PRIMARY_SPONSOR")}건
                  </span>
                  <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 font-medium text-indigo-800">
                    공동 {countBillsByRole(member, "CO_SPONSOR")}건
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function DistrictActivityPanel({
  activities,
  loadState,
  member,
  region
}: {
  activities: ActivityListItem[];
  loadState: LoadState;
  member: MemberListItem | null;
  region: RegionSummary | undefined;
}) {
  if (loadState === "loading") {
    return <PanelMessage title="3. 최근 활동" text="데이터를 불러오고 있습니다." />;
  }

  if (!member || !region) {
    return <PanelMessage title="3. 최근 활동" text="지도에서 지역을 하나 골라보세요." />;
  }

  const primaryBills = member.billMembers.filter(
    (item) => item.role === "PRIMARY_SPONSOR"
  );
  const coSponsoredBills = member.billMembers.filter(
    (item) => item.role === "CO_SPONSOR"
  );

  return (
    <aside className="rounded-md border border-slate-200 bg-white p-4 shadow-sm xl:sticky xl:top-4 xl:self-start">
      <p className="text-xs font-medium text-emerald-700">3. 최근 활동</p>
      <div className="mt-3 flex gap-3">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-slate-200">
          {member.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt="" className="h-full w-full object-cover" src={member.photoUrl} />
          ) : null}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">{region.label}</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950">
            {member.districtName}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {member.name} · {member.partyName ?? "정당 미확인"}
          </p>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3">
        <Stat label="대표발의" value={`${primaryBills.length}건`} />
        <Stat label="공동발의" value={`${coSponsoredBills.length}건`} />
      </dl>

      <section className="mt-5 border-t border-slate-200 pt-4">
        <h3 className="text-sm font-semibold text-slate-950">최근 의안 활동</h3>
        {activities.length > 0 ? (
          <ActivityTimeline activities={activities} member={member} />
        ) : (
          <p className="mt-3 text-sm text-slate-600">
            이번 수집 범위에서는 아직 확인된 의안 활동이 없습니다.
          </p>
        )}
      </section>

      <p className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-500">
        현재 표시는 수집된 최근 의안 100건과 의원 동기화 데이터 기준입니다.
      </p>

      <Link
        className="mt-5 block rounded-md border border-emerald-700 bg-emerald-700 px-3 py-2 text-center text-sm font-semibold text-white transition hover:bg-emerald-800"
        href={`/members/${encodeURIComponent(member.id)}`}
      >
        의원 활동 자세히 보기
      </Link>

      {member.profileUrl ? (
        <a
          className="mt-2 block rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 transition hover:border-emerald-700 hover:text-emerald-800"
          href={member.profileUrl}
          rel="noreferrer"
          target="_blank"
        >
          의원 프로필 보기
        </a>
      ) : null}
    </aside>
  );
}

function PanelMessage({ text, title }: { text: string; title: string }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      <p className="mt-2 text-sm text-slate-600">{text}</p>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-1 text-lg font-semibold text-slate-950">{value}</dd>
    </div>
  );
}

function ActivityTimeline({
  activities,
  member
}: {
  activities: ActivityListItem[];
  member: MemberListItem;
}) {
  return (
    <ol className="mt-3">
      {activities.slice(0, 8).map((activity) => (
        <li
          className="relative border-l-2 border-slate-200 pb-4 pl-4 last:pb-0"
          key={`${activity.billNo}-${activity.role}`}
        >
          <span className="absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-600" />
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="inline-flex min-h-6 items-center rounded-full bg-slate-100 px-2 text-xs font-medium text-slate-600">
              {formatDate(activity.proposedAt)}
            </span>
            <RoleBadge role={activity.role} />
            <StatusBadge status={activity.status} />
          </div>
          <p className="mt-1 text-sm leading-5 text-slate-950">
            {member.name} 의원이{" "}
            <Link
              className="font-medium text-emerald-800 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-950"
              href={`/bills/${encodeURIComponent(activity.billId)}`}
            >
              {activity.title}
            </Link>
            {activity.role === "PRIMARY_SPONSOR"
              ? "을 대표발의했습니다."
              : "에 공동발의자로 참여했습니다."}
          </p>
          {activity.detailUrl ? (
              <a
                className="mt-2 inline-flex min-h-7 items-center rounded-full border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-600 transition hover:border-emerald-700 hover:text-emerald-800"
                href={activity.detailUrl}
                rel="noreferrer"
                target="_blank"
            >
              국회 원문 보기
            </a>
          ) : null}
        </li>
      ))}
    </ol>
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

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-slate-950">{value}</dd>
    </div>
  );
}

function countBillsByRole(member: MemberListItem, role: BillMemberRole) {
  return member.billMembers.filter((item) => item.role === role).length;
}

function createMemberActivities(member: MemberListItem): ActivityListItem[] {
  return member.billMembers
    .map((item) => ({
      billId: item.bill.id,
      billNo: item.bill.billNo,
      detailUrl: item.bill.detailUrl,
      proposedAt: item.bill.proposedAt,
      role: item.role,
      status: item.bill.status,
      title: item.bill.title
    }))
    .sort((a, b) => getDateTime(b.proposedAt) - getDateTime(a.proposedAt));
}

function getDateTime(value: string | null) {
  if (!value) {
    return 0;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function createRegionSummaries(members: MemberListItem[]): RegionSummary[] {
  return regions.map((region) => {
    const regionMembers = members
      .filter((member) => getRegionId(member.districtName) === region.id)
      .sort((a, b) =>
        (a.districtName ?? a.name).localeCompare(b.districtName ?? b.name, "ko-KR")
      );
    const districtCount = new Set(
      regionMembers.map((member) => member.districtName ?? member.name)
    ).size;
    const recentPrimaryBillCount = regionMembers.reduce(
      (count, member) =>
        count +
        member.billMembers.filter((item) => item.role === "PRIMARY_SPONSOR").length,
      0
    );
    const recentCoSponsoredBillCount = regionMembers.reduce(
      (count, member) =>
        count +
        member.billMembers.filter((item) => item.role === "CO_SPONSOR").length,
      0
    );

    return {
      ...region,
      districtCount,
      memberCount: regionMembers.length,
      members: regionMembers,
      recentCoSponsoredBillCount,
      recentPrimaryBillCount
    };
  });
}

function getRegionId(districtName: string | null): string | null {
  if (!districtName || districtName === "비례대표") {
    return null;
  }

  if (districtName.startsWith("서울")) return "서울";
  if (districtName.startsWith("부산")) return "부산";
  if (districtName.startsWith("대구")) return "대구";
  if (districtName.startsWith("인천")) return "인천";
  if (districtName.startsWith("광주")) return "광주";
  if (districtName.startsWith("대전")) return "대전";
  if (districtName.startsWith("울산")) return "울산";
  if (districtName.startsWith("세종")) return "세종";
  if (districtName.startsWith("경기")) return "경기";
  if (districtName.startsWith("강원")) return "강원";
  if (districtName.startsWith("충북")) return "충북";
  if (districtName.startsWith("충남")) return "충남";
  if (districtName.startsWith("전북")) return "전북";
  if (districtName.startsWith("전남")) return "전남";
  if (districtName.startsWith("경북")) return "경북";
  if (districtName.startsWith("경남")) return "경남";
  if (districtName.startsWith("제주")) return "제주";

  return null;
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "날짜 미확인";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium"
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
