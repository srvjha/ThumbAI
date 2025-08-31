import { ImageEditorGenerator } from "@/components/ImageEdit";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function ImageEditorPage() {
  const user = await currentUser();

  if (!user || user.emailAddresses[0].emailAddress !== "srvjha@gmail.com") {
    redirect("/");
  }
  return <ImageEditorGenerator />;
}
