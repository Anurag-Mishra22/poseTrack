import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { currentUser } from "@clerk/nextjs/server";

export async function POST(req: Request) {
  try {
    const currentUserDetails = await currentUser();
    // if (
    //   currentUserDetails?.emailAddresses[0].emailAddress !==
    //   process.env.ADMIN_EMAIL
    // ) {
    //   return NextResponse.json(
    //     { error: "You are not authorized to create a user" },
    //     { status: 401 }
    //   );
    // }
    const client = await clerkClient();
    const { email } = await req.json();
    console.log(email);
    if (!email) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    const newUser = await client.users.createUser({
      // firstName: "Test",
      // lastName: "User",
      emailAddress: [email],
      // password: "password",
    });
    console.log(newUser);
    return NextResponse.json({ message: "User created", user: newUser });
  } catch (error: any) {
    // console.log(error);
    console.log(error.errors);
    return NextResponse.json({ error: "Error creating user" });
  }
}
