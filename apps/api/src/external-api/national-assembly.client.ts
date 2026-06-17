import { HttpService } from "@nestjs/axios";
import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type {
  NationalAssemblyBillClient,
  NationalAssemblyBillRow,
  NationalAssemblyCoactorRow,
  NationalAssemblyMemberRow
} from "@civic-lens/types";
import { XMLParser } from "fast-xml-parser";
import { firstValueFrom } from "rxjs";

@Injectable()
export class NationalAssemblyClient implements NationalAssemblyBillClient {
  readonly billListEndpoint = "nzmimeepazxkubdpn";
  readonly billDetailEndpoint = "ALLBILL";
  readonly memberEndpoint = "ALLNAMEMBER";

  private readonly xmlParser = new XMLParser({
    ignoreAttributes: false,
    trimValues: true
  });

  constructor(
    @Inject(HttpService)
    private readonly httpService: HttpService,
    @Inject(ConfigService)
    private readonly configService: ConfigService
  ) {}

  async fetchRecentBills(limit = 100): Promise<NationalAssemblyBillRow[]> {
    const raw = await this.requestBillApi({
      endpoint: this.billListEndpoint,
      params: {
        pIndex: 1,
        pSize: limit,
        AGE: this.getAssemblyAge()
      }
    });
    const rows = extractRows(raw);

    return rows
      .map((row) => this.normalizeBill(row))
      .filter((row) => row.billNo.length > 0);
  }

  async fetchBillDetail(billNo: string): Promise<unknown> {
    return this.requestBillApi({
      // TODO: ALLBILL requires BILL_NO in observed samples. Confirm whether BILL_ID has a separate detail API.
      endpoint: this.billDetailEndpoint,
      params: {
        pIndex: 1,
        pSize: 1,
        AGE: this.getAssemblyAge(),
        BILL_NO: billNo
      }
    });
  }

  async fetchBillDetailRow(billNo: string): Promise<NationalAssemblyBillRow | null> {
    const raw = await this.fetchBillDetail(billNo);
    const [row] = extractRows(raw);

    return row ? this.normalizeBill(row) : null;
  }

  async fetchBillCoactors(
    memberListUrl: string
  ): Promise<NationalAssemblyCoactorRow[]> {
    const url = parseLikmsUrl(memberListUrl);
    const response = await firstValueFrom(
      this.httpService.get<string>(url.toString(), {
        responseType: "text"
      })
    );

    return parseCoactorHtml(response.data, url.toString());
  }

  async fetchAssemblyMembers(): Promise<NationalAssemblyMemberRow[]> {
    const pageSize = 1000;
    const members: NationalAssemblyMemberRow[] = [];

    for (let page = 1; ; page += 1) {
      const raw = await this.requestBillApi({
        endpoint: this.memberEndpoint,
        params: {
          pIndex: page,
          pSize: pageSize
        }
      });
      const rows = extractRows(raw);

      members.push(
        ...rows
          .map((row) => this.normalizeAssemblyMember(row))
          .filter((row) => row.memberCode.length > 0 && row.name.length > 0)
      );

      if (rows.length < pageSize) {
        break;
      }
    }

    return members;
  }

  normalizeBill(raw: unknown): NationalAssemblyBillRow {
    const row = isRecord(raw) ? raw : {};

    return {
      billNo: String(row.BILL_NO ?? row.billNo ?? ""),
      billName: String(row.BILL_NAME ?? row.BILL_NM ?? row.billName ?? "Untitled bill"),
      proposer: optionalString(row.PROPOSER ?? row.PPSR_NM ?? row.proposer),
      proposeDate: optionalString(row.PROPOSE_DT ?? row.PPSL_DT ?? row.proposeDate),
      committee: optionalString(row.COMMITTEE ?? row.JRCMIT_NM ?? row.CURR_COMMITTEE ?? row.committee),
      status: optionalString(
        row.PROC_RESULT ??
          row.LAW_PROC_RSLT ??
          row.JRCMIT_PROC_RSLT ??
          row.RGS_CONF_RSLT ??
          row.status
      ),
      detailUrl: optionalString(row.DETAIL_LINK ?? row.LINK_URL ?? row.detailUrl),
      raw: row
    };
  }

  normalizeAssemblyMember(raw: unknown): NationalAssemblyMemberRow {
    const row = isRecord(raw) ? raw : {};

    return {
      memberCode: String(row.NAAS_CD ?? row.memberCode ?? ""),
      name: String(row.NAAS_NM ?? row.name ?? ""),
      partyName: optionalString(row.PLPT_NM ?? row.partyName),
      districtName: optionalString(row.ELECD_NM ?? row.districtName),
      committeeName: optionalString(row.BLNG_CMIT_NM ?? row.committeeName),
      electionUnits: optionalString(row.GTELT_ERACO ?? row.electionUnits),
      profileUrl: optionalString(row.NAAS_HP_URL ?? row.profileUrl),
      photoUrl: optionalString(row.NAAS_PIC ?? row.photoUrl),
      raw: row
    };
  }

  mergeBillRows(
    listRow: NationalAssemblyBillRow,
    detailRow: NationalAssemblyBillRow | null
  ): NationalAssemblyBillRow {
    if (!detailRow) {
      return listRow;
    }

    return {
      billNo: detailRow.billNo || listRow.billNo,
      billName:
        detailRow.billName === "Untitled bill" ? listRow.billName : detailRow.billName,
      proposer: detailRow.proposer ?? listRow.proposer,
      proposeDate: detailRow.proposeDate ?? listRow.proposeDate,
      committee: detailRow.committee ?? listRow.committee,
      status: detailRow.status ?? listRow.status,
      detailUrl: detailRow.detailUrl ?? listRow.detailUrl,
      raw: {
        ...listRow.raw,
        ...detailRow.raw,
        list: listRow.raw,
        detail: detailRow.raw
      }
    };
  }

  private async requestBillApi(input: {
    endpoint: string;
    params: Record<string, string | number>;
  }): Promise<unknown> {
    const baseUrl = this.configService.get<string>(
      "NATIONAL_ASSEMBLY_API_BASE_URL",
      "https://open.assembly.go.kr/portal/openapi"
    );
    const apiKey = this.configService.get<string>("NATIONAL_ASSEMBLY_API_KEY", "");

    if (!apiKey) {
      throw new Error("NATIONAL_ASSEMBLY_API_KEY is required for bill sync.");
    }

    const response = await firstValueFrom(
      this.httpService.get<string | unknown>(
        `${baseUrl}/${input.endpoint}`,
        {
          responseType: "text",
          params: {
            KEY: apiKey,
            Type: "xml",
            ...input.params
          }
        }
      )
    );

    if (typeof response.data === "string") {
      return this.xmlParser.parse(response.data);
    }

    return response.data;
  }

  private getAssemblyAge(): number {
    const configuredAge = this.configService.get<string>("NATIONAL_ASSEMBLY_AGE", "22");
    const parsedAge = Number(configuredAge);

    return Number.isFinite(parsedAge) ? parsedAge : 22;
  }
}

function extractRows(raw: unknown): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];

  visit(raw, rows);

  return rows;
}

function visit(value: unknown, rows: Record<string, unknown>[]): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      visit(item, rows);
    }

    return;
  }

  if (!isRecord(value)) {
    return;
  }

  const maybeRow = value.row ?? value.ROW;

  if (maybeRow) {
    visit(maybeRow, rows);
    return;
  }

  if (
    "BILL_NO" in value ||
    "BILL_NAME" in value ||
    "BILL_ID" in value ||
    "NAAS_CD" in value
  ) {
    rows.push(value);
    return;
  }

  for (const child of Object.values(value)) {
    visit(child, rows);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return String(value);
}

function parseLikmsUrl(value: string): URL {
  const url = new URL(value);

  if (url.hostname !== "likms.assembly.go.kr") {
    throw new Error(`Unsupported National Assembly member list host: ${url.hostname}`);
  }

  return url;
}

function parseCoactorHtml(
  html: string,
  sourceUrl: string
): NationalAssemblyCoactorRow[] {
  const rows: NationalAssemblyCoactorRow[] = [];
  const listHtml = firstMatch(html, /<[^>]+class=["'][^"']*member_list_img[^"']*["'][^>]*>([\s\S]*?)<\/(?:ul|ol)>/i) ?? html;
  const listItems = listHtml.match(/<li\b[\s\S]*?<\/li>/gi) ?? [];

  for (const itemHtml of listItems) {
    const anchorHtml = firstMatch(itemHtml, /<a\b[\s\S]*?<\/a>/i) ?? itemHtml;
    const paragraphs = Array.from(anchorHtml.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi))
      .map((match) => stripHtml(match[1]))
      .filter((text) => text.length > 0);
    const [name, hanjaName, partyName] = paragraphs;

    if (!name) {
      continue;
    }

    const profileUrl = optionalString(
      firstMatch(anchorHtml, /href=["']([^"']+)["']/i)
    );

    rows.push({
      name,
      partyName: partyName ?? null,
      profileUrl,
      raw: {
        name,
        hanjaName: hanjaName ?? null,
        partyName: partyName ?? null,
        profileUrl,
        sourceUrl
      }
    });
  }

  return rows;
}

function firstMatch(value: string, pattern: RegExp): string | null {
  return pattern.exec(value)?.[1] ?? null;
}

function stripHtml(value: string): string {
  return decodeHtmlEntities(value.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'");
}
