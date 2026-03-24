import { redirect } from "next/navigation";

export default async function FolderRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/learn?folderId=${encodeURIComponent(id)}`);
}
