import { NextResponse } from "next/server";
import { companyFromRequest } from "@/lib/services/api-auth";
import { createOAuthState, notionAuthorizeUrl } from "@/lib/notion/oauth";
import { errorMessage } from "@/lib/ai/errors";

export async function GET(request: Request) {
  const auth = await companyFromRequest();
  if (auth instanceof NextResponse) return NextResponse.redirect(new URL("/login", request.url));
  try {
    return NextResponse.redirect(notionAuthorizeUrl(createOAuthState(auth.companyId)));
  } catch (err) {
    return NextResponse.redirect(new URL(`/notion?error=${encodeURIComponent(errorMessage(err))}`, request.url));
  }
}
