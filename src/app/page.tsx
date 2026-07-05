import WalkieTalkieApp from "@/components/WalkieTalkieApp";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center">
      <WalkieTalkieApp channelName="Geral" />
    </div>
  );
}
