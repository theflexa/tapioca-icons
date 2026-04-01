import { UserButton } from "@clerk/nextjs";
import { Generator } from "@/components/generator";

export default function Home() {
  return (
    <main className="flex flex-col items-center p-8">
      <header className="w-full max-w-2xl flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">TapiocaIcons</h1>
        <UserButton />
      </header>
      <Generator />
    </main>
  );
}
