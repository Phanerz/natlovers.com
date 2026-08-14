import {notFound} from "next/navigation";
import {CustomRequestDetail} from "@/components/admin/custom-request-detail";
import {getCustomRequest} from "@/lib/custom-requests";

// Auth is already gated by app/mimin/layout.tsx.
export const dynamic = "force-dynamic";

export default async function AdminCustomRequestPage({params}: {params: Promise<{id: string}>}) {
  const {id} = await params;
  const request = await getCustomRequest(id);

  if (!request) {
    notFound();
  }

  return <CustomRequestDetail initial={request} />;
}
