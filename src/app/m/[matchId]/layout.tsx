import type { Metadata } from "next";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  params: Promise<{ matchId: string }>;
  children: React.ReactNode;
};

const DAY_NAMES = [
  "Chủ Nhật",
  "Thứ Hai",
  "Thứ Ba",
  "Thứ Tư",
  "Thứ Năm",
  "Thứ Sáu",
  "Thứ Bảy",
];

function formatDayOfWeek(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    if (!year || !month || !day) return "";
    const d = new Date(year, month - 1, day);
    return DAY_NAMES[d.getDay()] || "";
  } catch {
    return "";
  }
}

function formatDateVn(dateStr: string): { full: string; short: string; dayName: string } {
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    const dayName = formatDayOfWeek(dateStr);
    const dPad = String(day).padStart(2, "0");
    const mPad = String(month).padStart(2, "0");
    return {
      dayName,
      short: `${dPad}/${mPad}`,
      full: `${dPad}/${mPad}/${year}`,
    };
  } catch {
    return { dayName: "", short: dateStr, full: dateStr };
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ matchId: string }>;
}): Promise<Metadata> {
  const { matchId } = await params;
  if (!matchId) {
    return {
      title: "Kèo cầu lông | BSche",
      description: "Lên lịch và điểm danh trận cầu lông trên BSche",
    };
  }

  try {
    const { data: result, error } = await supabase.rpc("get_public_match", {
      p_match_id: matchId,
    });

    if (error || !result || !result.match) {
      return {
        title: "Kèo cầu lông | BSche",
        description: "Điểm danh tham gia trận cầu lông trên BSche",
      };
    }

    const match = result.match;
    const { dayName, short: dateShort, full: dateFull } = formatDateVn(match.date);
    const startTime = match.time ? match.time.slice(0, 5) : "";
    const endTime = match.endTime ? match.endTime.slice(0, 5) : "";
    const timeDisplay = endTime ? `${startTime} - ${endTime}` : startTime;

    const titleParts: string[] = [];
    if (match.title) {
      titleParts.push(match.title);
    }
    if (dayName && dateShort) {
      titleParts.push(`${dayName}, ${dateShort}`);
    }
    const ogTitle = titleParts.length > 0 
      ? `🏸 ${titleParts.join(" | ")}` 
      : "🏸 Kèo cầu lông | BSche";

    const descParts: string[] = [];
    if (dayName && dateFull) {
      descParts.push(`📅 ${dayName}, ${dateFull}`);
    }
    if (timeDisplay) {
      descParts.push(`⏰ ${timeDisplay}`);
    }
    if (match.location) {
      descParts.push(`📍 ${match.location}`);
    }
    descParts.push("👉 Bấm để điểm danh tham gia!");

    const ogDescription = descParts.join(" • ");

    return {
      title: `${ogTitle} | BSche`,
      description: ogDescription,
      openGraph: {
        title: ogTitle,
        description: ogDescription,
        type: "website",
      },
      twitter: {
        card: "summary",
        title: ogTitle,
        description: ogDescription,
      },
    };
  } catch {
    return {
      title: "Kèo cầu lông | BSche",
      description: "Điểm danh tham gia trận cầu lông trên BSche",
    };
  }
}

export default async function PublicMatchLayout({
  children,
}: Props) {
  return <>{children}</>;
}
