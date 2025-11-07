import { db } from "@/db";
import { ApiError } from "@/utils/ApiError";
import { ApiResponse } from "@/utils/ApiResponse";
import { NextRequest, NextResponse } from "next/server";

export const PATCH = async (req: NextRequest) => {
  const { userId, credits = 1 } = await req.json();

  if (!userId) {
    throw new ApiError("User ID is required", 400);
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError("User not found", 404);

  if (user.credits < credits) {
    throw new ApiError("Not enough credits", 400);
  }

  const updateUserCredits = await db.user.update({
    where: { id: userId },
    data: { credits: { decrement: credits } },
  });

  if (!updateUserCredits) {
    throw new ApiError("Credits Updation Failed", 400);
  }

  return NextResponse.json(
    new ApiResponse(200, updateUserCredits, "Credit Deducted Successfully"),
    { status: 200 },
  );
};

export const PUT = async (req: NextRequest) => {
  const { userId, credits } = await req.json();

  if (!userId) {
    throw new ApiError("User ID is required", 400);
  }
  if (!credits || credits <= 0) {
    throw new ApiError("Credits must be greater than 0", 400);
  }

  // ✅ Check if user exists
  const existingUser = await db.user.findUnique({
    where: { id: userId },
  });

  if (!existingUser) {
    throw new ApiError("User not found", 404);
  }

  // ✅ Update user credits
  const updateUserCredits = await db.user.update({
    where: { id: userId },
    data: { credits: { increment: credits } },
  });

  if (!updateUserCredits) {
    throw new ApiError("Credits Updation Failed", 400);
  }

  return NextResponse.json(
    new ApiResponse(200, updateUserCredits, "Credits Added Successfully"),
    { status: 200 },
  );
};
