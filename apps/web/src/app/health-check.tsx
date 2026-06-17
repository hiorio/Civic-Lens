"use client";

import { useState } from "react";

type HealthState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok" | "warning"; apiMessage: string; dbMessage: string }
  | { status: "error"; message: string };

export function HealthCheck() {
  const [state, setState] = useState<HealthState>({ status: "idle" });

  async function checkApi() {
    setState({ status: "loading" });

    try {
      const apiBaseUrl =
        process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/v1";
      const [apiResponse, dbResponse] = await Promise.all([
        fetch(`${apiBaseUrl}/health`),
        fetch(`${apiBaseUrl}/health/db`)
      ]);

      if (!apiResponse.ok) {
        setState({
          status: "error",
          message: `API 응답 코드 ${apiResponse.status}`
        });
        return;
      }

      const apiBody = (await apiResponse.json()) as {
        status?: string;
        service?: string;
      };
      const dbBody = (await dbResponse.json()) as {
        status?: string;
        database?: string;
      };
      const dbOk = dbResponse.ok && dbBody.status === "ok";

      setState({
        status: dbOk ? "ok" : "warning",
        apiMessage: `${apiBody.service ?? "api"} · ${apiBody.status ?? "ok"}`,
        dbMessage: dbOk
          ? "DB · 연결됨"
          : `DB · ${dbBody.database ?? "연결 안 됨"}`
      });
    } catch {
      setState({
        status: "error",
        message: "연결 실패"
      });
    }
  }

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-950">API 상태</h2>
        <button
          className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
          onClick={checkApi}
          type="button"
        >
          확인
        </button>
      </div>

      <div className="mt-3 min-h-5 text-sm text-slate-600">
        {state.status === "idle" ? "대기 중" : null}
        {state.status === "loading" ? "확인 중" : null}
        {state.status === "ok" || state.status === "warning" ? (
          <div className="space-y-1">
            <p>{state.apiMessage}</p>
            <p
              className={
                state.status === "ok" ? "text-emerald-700" : "text-amber-700"
              }
            >
              {state.dbMessage}
            </p>
          </div>
        ) : null}
        {state.status === "error" ? state.message : null}
      </div>
    </section>
  );
}
