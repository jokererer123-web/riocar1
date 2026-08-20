import { NextResponse, type NextRequest } from "next/server";
import { locales, defaultLocale } from "@/lib/i18n";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/_next") || pathname.includes(".")) return NextResponse.next();
  const has = locales.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
  if (has) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = `/${defaultLocale}${pathname}`;
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"] };
