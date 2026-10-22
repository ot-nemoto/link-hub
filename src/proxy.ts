import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { logAudit } from "@/lib/audit-log";

// どのパスが「公開」「CORS 対象の外部 API」かを決める分類はこのファイルの急所であり、
// 誤ると静かに認証を無効化しうる。回帰防止のため export して proxy.test.ts で固定する。
export const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)", "/auth-error"]);

// 外部連携用 REST API（Clerk ではなく API キー認証で保護）。CORS 対応の対象でもある。
export const isApiRoute = createRouteMatcher([
  "/api/bookmarks(.*)",
  "/api/tags(.*)",
  "/api/ogp(.*)",
]);

// API キー認証（Authorization ヘッダ）・Cookie 不使用のため、任意オリジン許可（*）で安全。
export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Max-Age": "86400",
};

function withCors(res: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(CORS_HEADERS)) res.headers.set(key, value);
  return res;
}

export default clerkMiddleware(async (auth, request) => {
  // 外部連携 API は CORS 対応。プリフライトは認証不要で 204 を返し、通常応答にも CORS を付与する。
  // 認証は各ルートの API キー検証に委ねる（Clerk 保護対象外）。
  if (isApiRoute(request)) {
    if (request.method === "OPTIONS") {
      return withCors(new NextResponse(null, { status: 204 }));
    }
    return withCors(NextResponse.next());
  }

  // 未知の API ルートは JSON 404 を返す（画面はリダイレクト）。
  // mock バイパスより前に評価する: 後段に置くと MOCK_USER_ID 設定時に isApiRoute 未登録の
  // /api/* が素通りしてハンドラに到達し、ローカルの curl 検証が本番挙動と乖離するため。
  //
  // ここはハンドラに到達しないため withApiErrorHandling の記録が効かない。
  // 未登録パスへの連続アクセスはエンドポイント列挙の主要な痕跡なので、ここで残す。
  // Edge Runtime では DB を引けないため userId は null になる（IP で追う）。
  if (!isPublicRoute(request) && request.nextUrl.pathname.startsWith("/api/")) {
    logAudit(request, 404);
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  // 開発環境でのモックユーザーによる認証バイパス
  if (
    process.env.NODE_ENV !== "production" &&
    (process.env.MOCK_USER_ID || process.env.MOCK_USER_EMAIL)
  ) {
    return NextResponse.next();
  }

  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
