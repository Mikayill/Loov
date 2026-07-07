import BundleEditorClient from "./BundleEditorClient";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function AdminBundleEditorPage({ params }: Props) {
  const { slug } = await params;
  return <BundleEditorClient slug={slug} />;
}
