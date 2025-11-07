import { db } from "@/db";
import { ApiError } from "@/utils/ApiError";
import { ApiResponse } from "@/utils/ApiResponse";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server"; // ✅ server-side Clerk helper

export const GET = async (req: NextRequest) => {
  try {
    const { userId } = await auth();

    if (!userId) {
      throw new ApiError("Unauthorized - Clerk ID is missing", 401);
    }
    const existingUser = await db.user.findFirst({
      where: {
        clerk_id: userId,
      },
    });

    if (!existingUser) {
      throw new ApiError("User not found", 404);
    }

    return NextResponse.json(
      new ApiResponse(200, existingUser, "User fetched successfully"),
      { status: 200 },
    );
  } catch (err: any) {
    return NextResponse.json(
      new ApiResponse(
        err.statusCode || 500,
        null,
        err.message || "Server Error",
      ),
      { status: err.statusCode || 500 },
    );
  }
};
