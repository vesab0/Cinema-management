import SecondaryNav from "../components/Secondarynav";
import CurtainOpen from "../components/CurtainOpen";
import Hero from "../components/Hero";

export default function Index() {
  return (
    <div className="h-screen w-full">
      <CurtainOpen>
        <SecondaryNav/>
        <Hero></Hero>  
      </CurtainOpen>






    </div>
  );
}