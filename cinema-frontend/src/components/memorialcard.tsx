export default function MemorialCard() {
  return (
    <section className="w-full bg-black py-24 flex flex-col items-center px-4">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Rock+Salt&display=swap');`}</style>
      <div className="text-center mb-16 max-w-2xl">
        <p
          className="text-white leading-loose"
          style={{ fontFamily: "'Rock Salt', cursive", fontSize: "1.1rem" }}
        >
          In Loving Memory of David Keith Lynch: A fan memorial Live from Kosovo, Prishtina
        </p>
      </div>
      <img
        src="/memorial.png"
        className="w-full max-w-sm"
      />
    </section>
  )
}