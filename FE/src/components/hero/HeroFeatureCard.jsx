export function HeroFeatureCard({ icon: Icon, title, description, delay = 0 }) {
  return (
    <div
      className="glass rounded-xl p-6 text-center transition-all duration-300 group hover:border-primary/50"
      data-aos="fade-up"
      data-aos-delay={delay}
    >
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg gradient-primary transition-transform group-hover:scale-110">
        <Icon className="h-6 w-6 text-primary-foreground" />
      </div>
      <h3 className="mb-2 font-display text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}