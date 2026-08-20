import Header from "@/components/Header";
import PromoBanner from "@/components/PromoBanner";
import Image from "next/image";
import heroImage from "@/public/images/rio-hero.jpg";
import detailingImage from "@/public/images/rio-detailing.jpg";
import foamImage from "@/public/images/rio-foam.jpg";
import interiorImage from "@/public/images/rio-interior.jpg";
import { fallbackServices, isLocale, t, type Locale } from "@/lib/i18n";
import { supabaseBrowser } from "@/lib/supabase";

const serviceIcons = ["✦", "◇", "◌", "⌁", "≋", "▦"];

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

  const labels = lang === "ky"
    ? { eyebrow: "Караколдогу премиум авто кам көрүү", book: "Жазылуу", explore: "Кызматтарды көрүү", daily: "күн сайын", years: "жылдык тажрыйба", clients: "ыраазы кардар", promise: "Жөн гана таза эмес. Кемчиликсиз.", promiseSub: "Унааңызга татыктуу кам көрүү", process: "Мыкты натыйжа. Ар бир жолу.", processText: "Кузовдон салонго чейин — унааңыздын ар бир деталын премиум каражаттар менен тазалайбыз.", wash: "Жуу", detail: "Деталинг", finish: "Коргоо", from: "баштап" }
    : lang === "ru"
      ? { eyebrow: "Премиальный уход за авто в Караколе", book: "Записаться", explore: "Смотреть услуги", daily: "ежедневно", years: "лет опыта", clients: "довольных клиентов", promise: "Не просто чисто. Безупречно.", promiseSub: "Уход, которого достоин ваш автомобиль", process: "Безупречный результат. Каждый раз.", processText: "От кузова до салона — бережно очищаем каждую деталь вашего автомобиля профессиональными средствами.", wash: "Мойка", detail: "Детейлинг", finish: "Защита", from: "от" }
      : { eyebrow: "Premium car care in Karakol", book: "Book a wash", explore: "Explore services", daily: "open daily", years: "years of experience", clients: "happy customers", promise: "Not just clean. Flawless.", promiseSub: "The care your car deserves", process: "A flawless finish. Every time.", processText: "From bodywork to cabin, every detail is carefully restored with professional-grade products.", wash: "Wash", detail: "Detail", finish: "Protect", from: "from" };

  return (
    <>
      <Header lang={lang} />
      <section className="hero">
        <Image className="hero-photo" src={heroImage} alt="Premium Rio Car Wash" fill priority sizes="100vw" />
        <div className="hero-vignette" />
        <div className="hero-copy container">
          <div className="hero-status ui"><i /> {lang === "ru" ? "СЕЙЧАС ОТКРЫТО" : lang === "en" ? "OPEN NOW" : "АЗЫР АЧЫК"}</div>
          <p className="eyebrow ui"><span />{labels.eyebrow}<span /></p>
          <h1>{copy.heroTitle}</h1>
          <p className="hero-sub muted">{copy.heroSub}</p>
          <div className="hero-actions">
            <a className="btn btn-large" href="https://wa.me/996505696797" target="_blank" rel="noreferrer">{labels.book} <span>↗</span></a>
            <a className="btn ghost btn-large" href="#services">{labels.explore} <span>↓</span></a>
          </div>
        </div>
        <div className="scroll-cue ui"><span /> SCROLL</div>
      </section>

      <main>
        <div className="container"><PromoBanner lang={lang} /></div>

        <section className="trust-strip ui">
          <div className="container trust-grid">
            <div><strong>08:00–22:00</strong><span>{labels.daily}</span></div>
            <div><strong>7+</strong><span>{labels.years}</span></div>
            <div><strong>5,000+</strong><span>{labels.clients}</span></div>
            <div><strong>4.9</strong><span className="stars">★★★★★</span></div>
          </div>
        </section>

        <section className="showcase">
          <Image className="showcase-photo" src={detailingImage} alt="Rio premium hand detailing" fill sizes="100vw" />
          <div className="showcase-overlay" />
          <div className="container showcase-copy">
            <p className="section-kicker ui">THE RIO STANDARD</p>
            <h2>{labels.promise}</h2>
            <p className="ui">{labels.promiseSub}</p>
          </div>
          <div className="showcase-word ui">PRECISION</div>
        </section>

        <section className="section container about-grid" id="about">
          <div>
            <p className="section-kicker ui">01 — RIO CAR WASH</p>
            <h2>{copy.aboutTitle}</h2>
          </div>
          <div>
            <p className="lead muted">{copy.aboutBody}</p>
            <div className="signature">Rio <span>— Karakol</span></div>
          </div>
        </section>

        <section className="section services-section" id="services">
          <div className="container">
            <div className="section-heading">
              <div><p className="section-kicker ui">02 — PREMIUM CARE</p><h2>{copy.servicesTitle}</h2></div>
              <p className="muted ui">{labels.processText}</p>
            </div>
            <div className="services-grid">
              {services.map((service, index) => (
                <article className="service-card" key={service.slug}>
                  <div className="service-top"><span className="service-icon">{serviceIcons[index % serviceIcons.length]}</span><span className="service-number ui">0{index + 1}</span></div>
                  <h3>{(service as any)[titleKey] ?? service.title_en}</h3>
                  <div className="service-price ui"><small>{labels.from}</small> {service.price ? `${service.price.toLocaleString()} KGS` : "—"}</div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section container" id="gallery">
          <div className="section-heading"><div><p className="section-kicker ui">03 — THE PROCESS</p><h2>{labels.process}</h2></div></div>
          <div className="process-grid">
            {[
              { label: labels.wash, image: foamImage, alt: "Luxury snow foam car wash" },
              { label: labels.detail, image: interiorImage, alt: "Premium interior steam detailing" },
              { label: labels.finish, image: detailingImage, alt: "Hand-finished paint detailing" },
            ].map((item, index) => (
              <article className={`process-card process-${index + 1}`} key={item.label}>
                <Image className="process-photo" src={item.image} alt={item.alt} fill sizes={index === 0 ? "(max-width: 700px) 100vw, 58vw" : "(max-width: 700px) 100vw, 42vw"} />
                <div className="process-shade" />
                <div className="process-label ui"><span>0{index + 1}</span><strong>{item.label}</strong></div>
              </article>
            ))}
          </div>
        </section>

        <section className="section review-section" id="reviews">
          <div className="container">
            <p className="section-kicker ui">04 — {copy.reviewsTitle.toUpperCase()}</p>
            <div className="reviews-grid">
              {(["Айбек Т.", "Мария К.", "Nurlan"] as const).map((name, index) => (
                <article className="review-card" key={name}>
                  <p className="quote">“</p>
                  <p className="review-text">
                    {lang === "ky" ? ["Rio мыкты иштейт. Унаам жаңыдай жаркырайт.", "Килемдер таптаза болуп калды. Рахмат!", "Химчистка абдан сапаттуу жасалды."][index]
                      : lang === "ru" ? ["Rio отлично моет. Машина сияет как новая.", "Ковры стали идеально чистыми. Спасибо!", "Химчистка выполнена на высшем уровне."][index]
                      : ["Rio does excellent work. My car shines like new.", "The carpets came back perfectly clean.", "The detailing was done to an exceptional standard."][index]}
                  </p>
                  <div className="review-author ui"><span>{name.charAt(0)}</span><div><strong>{name}</strong><small>★★★★★</small></div></div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section container" id="contact">
          <div className="contact-card">
            <div className="contact-copy">
              <p className="section-kicker ui">05 — {copy.contactTitle.toUpperCase()}</p>
              <h2>{copy.contactTitle}</h2>
              <div className="contact-details ui">
                <p><small>ADDRESS</small>{copy.address}</p><p><small>HOURS</small>{copy.hours}</p>
                <p><small>PHONE</small><a href="tel:+996505696797">{copy.phone}</a></p>
              </div>
              <a className="btn btn-large" href="https://wa.me/996505696797" target="_blank" rel="noreferrer">{labels.book} ↗</a>
            </div>
            <iframe title="Rio Car Wash location" loading="lazy" src="https://maps.google.com/maps?q=Karakol%20Gagarin%2027/1&t=&z=15&ie=UTF8&iwloc=&output=embed" />
          </div>
        </section>
      </main>

      <a className="floating-wa ui" href="https://wa.me/996505696797" target="_blank" rel="noreferrer" aria-label="WhatsApp"><span>◉</span><b>{copy.wa}</b></a>
      <footer><div className="container footer-inner ui"><span className="brand-footer">RIO</span><span>© {new Date().getFullYear()} Rio Car Wash · Karakol</span><span><a href={`/${lang}/worker`}>{copy.nav.worker}</a> · <a href={`/${lang}/admin`}>{copy.nav.admin}</a></span></div></footer>
    </>
  );
}
