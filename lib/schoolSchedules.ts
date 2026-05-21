// Cached schedule/results for the demo schools, bundled at build time so the
// public demo can show real recent results instantly. Refresh with
// `npx tsx scripts/cache-schedules.ts`.

import type { ScheduleData } from "@/lib/agent/types";

import amherst from "@/data/schedules/amherst.json";
import bowdoin from "@/data/schedules/bowdoin.json";
import carleton from "@/data/schedules/carleton.json";
import hamilton from "@/data/schedules/hamilton.json";
import macalester from "@/data/schedules/macalester.json";
import middlebury from "@/data/schedules/middlebury.json";
import pomonaPitzer from "@/data/schedules/pomona-pitzer.json";
import trinity from "@/data/schedules/trinity.json";
import tufts from "@/data/schedules/tufts.json";
import vassar from "@/data/schedules/vassar.json";
import wesleyan from "@/data/schedules/wesleyan.json";
import williams from "@/data/schedules/williams.json";

export const SCHOOL_SCHEDULES: Record<string, ScheduleData> = {
  amherst: amherst as ScheduleData,
  bowdoin: bowdoin as ScheduleData,
  carleton: carleton as ScheduleData,
  hamilton: hamilton as ScheduleData,
  macalester: macalester as ScheduleData,
  middlebury: middlebury as ScheduleData,
  "pomona-pitzer": pomonaPitzer as ScheduleData,
  trinity: trinity as ScheduleData,
  tufts: tufts as ScheduleData,
  vassar: vassar as ScheduleData,
  wesleyan: wesleyan as ScheduleData,
  williams: williams as ScheduleData,
};
