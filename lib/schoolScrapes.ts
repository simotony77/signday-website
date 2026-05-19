// Static imports so the JSON files get bundled into the serverless function
// at build time. Otherwise Vercel may not include the data/ folder in the
// function bundle.

import amherst from "@/data/scrapes/amherst.json";
import bowdoin from "@/data/scrapes/bowdoin.json";
import carleton from "@/data/scrapes/carleton.json";
import hamilton from "@/data/scrapes/hamilton.json";
import macalester from "@/data/scrapes/macalester.json";
import middlebury from "@/data/scrapes/middlebury.json";
import pomonaPitzer from "@/data/scrapes/pomona-pitzer.json";
import trinity from "@/data/scrapes/trinity.json";
import tufts from "@/data/scrapes/tufts.json";
import vassar from "@/data/scrapes/vassar.json";
import wesleyan from "@/data/scrapes/wesleyan.json";
import williams from "@/data/scrapes/williams.json";

export interface Player {
  name: string;
  position: string;
  class_year: string;
  graduating?: boolean;
}

export interface Coach {
  name: string;
  title: string;
}

export interface SchoolData {
  team: string;
  season: number;
  roster: Player[];
  coaching_staff: Coach[];
  seniors_graduating_next?: string[];
}

export const SCHOOL_SCRAPES: Record<string, SchoolData> = {
  amherst: amherst as SchoolData,
  bowdoin: bowdoin as SchoolData,
  carleton: carleton as SchoolData,
  hamilton: hamilton as SchoolData,
  macalester: macalester as SchoolData,
  middlebury: middlebury as SchoolData,
  "pomona-pitzer": pomonaPitzer as SchoolData,
  trinity: trinity as SchoolData,
  tufts: tufts as SchoolData,
  vassar: vassar as SchoolData,
  wesleyan: wesleyan as SchoolData,
  williams: williams as SchoolData,
};
