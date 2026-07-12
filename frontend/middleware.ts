import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// This function can be marked `async` if using `await` inside
export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });
  const url = request.nextUrl;

  // Define protected routes
  const isAuthPage = url.pathname.startsWith("/auth");
  const isApiRoute = url.pathname.startsWith("/api");
  const isPublicRoute =
    url.pathname === "/" ||
    url.pathname.startsWith("/_next") ||
    url.pathname.includes("."); // for static assets

  // If user is not authenticated and trying to access a protected route
  if (!token && !isAuthPage && !isApiRoute && !isPublicRoute && url.pathname !== "/") {
    // Redirect to login page
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("callbackUrl", url.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If user is authenticated and trying to access auth pages, redirect to home
  if (token && isAuthPage) {
    const homeUrl = new URL("/", request.url);
    return NextResponse.redirect(homeUrl);
  }

  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};