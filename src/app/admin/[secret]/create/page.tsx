import CreateGameForm from "@/components/admin/CreateGameForm";

export default async function CreateGamePage({
  params,
}: {
  params: Promise<{ secret: string }>;
}) {
  const { secret } = await params;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-serif text-black">
        Create Game
      </h1>
      <CreateGameForm adminSecret={secret} />
    </div>
  );
}
