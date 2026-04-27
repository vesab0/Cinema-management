import SecondaryNav from "../components/SecondaryNav";
import CurtainOpen from "../components/CurtainOpen";
import Hero from "../components/Hero";

export default function Index() {
  return (
    <div className="h-screen w-full">
      <CurtainOpen>
        <SecondaryNav />
        <Hero />
      </CurtainOpen>
    </div>
  );
}
