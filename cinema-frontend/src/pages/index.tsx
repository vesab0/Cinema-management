import SecondaryNav from "../components/SecondaryNav"
import Hero from "../components/Hero"
import CurtainOpen from "../components/CurtainOpen"
import AboutUs from "../components/aboutussection"
import MemorialCard from "../components/memorialcard"
import FindUs from "../components/findus"
import Footer from "../components/footer"

export default function Index() {
  return (
    <div className="w-full">
      <CurtainOpen>
        <div className="w-full">
          <SecondaryNav />
          <Hero />
          <AboutUs />
          <MemorialCard />
          <FindUs />
        </div>
      </CurtainOpen>
      <Footer />
    </div>
  )
}
