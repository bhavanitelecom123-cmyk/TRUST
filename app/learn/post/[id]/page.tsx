import { redirect } from "next/navigation";

export default async function PostRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/learn?postId=${encodeURIComponent(id)}`);
}
