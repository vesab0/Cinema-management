
import SecondaryNav from "../components/SecondaryNav"
import Hero from "../components/Hero"
import AboutUs from "../components/aboutussection"
import MemorialCard from "../components/memorialcard"
import FindUs from "../components/findus"
import Footer from "../components/footer"

export default function Index() {
  return (
    <div className="w-full">
      <SecondaryNav />
      <Hero />
      <AboutUs />
      <MemorialCard />
      <FindUs />
      <Footer/>
    </div>
  )
}
