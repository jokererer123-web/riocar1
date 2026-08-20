import Header from "@/components/Header";
import WashCanvas from "@/components/WashCanvas";
import { fallbackServices, isLocale, t, type Locale } from "@/lib/i18n";
import { supabaseBrowser } from "@/lib/supabase";
import PromoBanner from "@/components/PromoBanner";

export default async function Landing({ params }: { params: { lang: string } }) {
  const lang: Locale = isLocale(params.lang) ? params.lang : "ky";
  const copy = t(lang);
  const titleKey = `title_${lang}` as const;

  let services = fallbackServices;
  const sb = supabaseBrowser();
  if (sb) {
    const { data } = await sb.from("services").select("*").eq("is_active", true).order("sort_order");
    if (data?.length) services = data as typeof fallbackServices;
  }

  return (
    <>
      <Header lang={lang} />
      <section className="hero">
        <WashCanvas />
        <div className="hero-copy container">
          <p className="gold ui" style={{ letterSpacing: "0.3em", textTransform: "uppercase", fontSize: 12 }}>
            {copy.tagline}
          </p>
          <h1>{copy.heroTitle}</h1>
          <p className="muted" style={{ fontSize: 22, marginTop: 8 }}>
            {copy.heroSub}
          </p>
        </div>
      </section>

      <main className="container">
        <PromoBanner lang={lang} />

        <section className="section" id="about">
          <h2>{copy.aboutTitle}</h2>
          <p className="muted" style={{ maxWidth: 640, fontSize: 20 }}>
            {copy.aboutBody}
          </p>
        </section>

        <section className="section" id="services">
          <h2>{copy.servicesTitle}</h2>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
            {services.map((s) => (
              <article className="card" key={s.slug}>
                <div className="gold ui" style={{ fontSize: 12, letterSpacing: "0.2em" }}>RIO</div>
                <h3 style={{ margin: "8px 0" }}>{(s as any)[titleKey] ?? s.title_en}</h3>
                <p className="muted ui">{s.price ? `${s.price} KGS` : "—"}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section" id="gallery">
          <h2>{copy.galleryTitle}</h2>
          <div className="grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", minHeight: 180 }}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="card"
                style={{
                  minHeight: 160,
                  background: `linear-gradient(160deg, #1a1408 0%, #0c1018 ${i * 20}%)`,
                }}
              />
            ))}
          </div>
        </section>

        <section className="section" id="reviews">
          <h2>{copy.reviewsTitle}</h2>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
            {(["Айбек Т.", "Мария К.", "Nurlan"] as const).map((name, i) => (
              <article className="card" key={name}>
                <p>★★★★★</p>
                <p style={{ margin: "8px 0" }}>
                  {lang === "ky"
                    ? ["Rio мыкты иштейт.", "Килемдер таза.", "Химчистка мыкты."][i]
                    : lang === "ru"
                    ? ["Rio отлично моет.", "Ковры идеальны.", "Химчистка на высоте."][i]
                    : ["Rio shines.", "Carpets look new.", "Detailing is excellent."][i]}
                </p>
                <p className="muted ui">{name}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section" id="contact">
          <h2>{copy.contactTitle}</h2>
          <div className="card ui">
            <p>{copy.address}</p>
            <p>{copy.hours}</p>
            <p>
              <a className="gold" href="https://wa.me/505696797">
                {copy.phone}
              </a>
            </p>
            <iframe
              title="map"
              style={{ width: "100%", height: 280, border: 0, marginTop: 16, borderRadius: 12, filter: "grayscale(0.4) contrast(1.1)" }}
              src="https://maps.google.com/maps?q=Karakol%20Gagarin%2027/1&t=&z=15&ie=UTF8&iwloc=&output=embed"
            />
          </div>
        </section>
      </main>
      <footer>
        <div className="container ui">© {new Date().getFullYear()} Rio Car Wash · Karakol</div>
      </footer>
    </>
  );
}
