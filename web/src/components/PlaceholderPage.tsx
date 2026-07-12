import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";

export interface PlaceholderPageProps {
  title: string;
  description?: string;
}

/** Temporary "coming soon" page for nav destinations feature agents will replace. */
export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      <EmptyState
        title="Coming soon"
        description={`The ${title.toLowerCase()} experience is being tailored as we speak. Check back shortly.`}
      />
    </div>
  );
}
