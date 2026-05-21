export default function FindUs() {
  const lat = 42.6533769
  const lon = 21.1468247
  const zoom = 15
  const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.007}%2C${lat - 0.005}%2C${lon + 0.007}%2C${lat + 0.005}&layer=mapnik&marker=${lat}%2C${lon}`

  return (
    <section className="w-full bg-black text-white px-4 py-24">
      <div className="mx-auto max-w-5xl flex flex-col md:flex-row gap-12 items-start">
        <div className="flex-1">
          <h2 className="text-4xl font-black uppercase text-white mb-8">Find Us</h2>
          <div className="flex flex-col gap-5 text-white/70 text-base">
            <div className="flex items-start gap-3">
              <span>Location: </span>
              <span>Rruga Xhevded Doda, Prishtina</span>
            </div>
            <div className="flex items-start gap-3">
              <span>Email: </span>
              <span>twinpeaks@cinema.com</span>
            </div>
            <div className="flex items-start gap-3">
              <span>Working Hours: </span>
              <span>Mon–Sun: 10:00AM – 02:00AM</span>
            </div>
          </div>
        </div>

        <div className="flex-1 w-full border border-white/10 overflow-hidden" style={{ height: '320px' }}>
          <iframe
            src={mapSrc}
            title="Twin Peaks Cinema location"
            width="100%"
            height="100%"
            style={{ border: 'none', filter: 'invert(90%) hue-rotate(180deg)' }}
          />
        </div>
      </div>
    </section>
  )
}