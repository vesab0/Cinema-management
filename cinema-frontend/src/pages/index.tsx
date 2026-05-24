import { useEffect, useState } from "react"
import SecondaryNav from "../components/SecondaryNav"
import Hero from "../components/Hero"
import CurtainOpen from "../components/CurtainOpen"
import AboutUs from "../components/aboutussection"
import MemorialCard from "../components/memorialcard"
import FindUs from "../components/findus"
import Footer from "../components/footer"

export default function Index() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener("resize", handler)
    return () => window.removeEventListener("resize", handler)
  }, [])

  const inner = (
    <div className="w-full">
      <SecondaryNav />
      <Hero />
      <AboutUs />
      <MemorialCard />
      <FindUs />
    </div>
  )

  return (
    <div className="w-full">
      {isMobile ? inner : <CurtainOpen>{inner}</CurtainOpen>}
      <Footer />
    </div>
  )
}
