import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    totalReviews: 0,
    reviews: [],
    _note: "PlayStation 平台暂不提供评测抓取，敬请期待。",
  });
}
