interface Props {
  name: string;
  url?: string;
  size?: 'sm' | 'md';
}

/** Show poster, or a generated gradient tile when no artwork exists. */
export function Poster({ name, url, size = 'md' }: Props) {
  if (url) return <img className={`poster poster-${size}`} src={url} alt="" loading="lazy" />;
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const hue = hash % 360;
  const initials = name
    .replace(/^the\s+/i, '')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('');
  return (
    <div
      className={`poster poster-${size} poster-fallback`}
      style={{
        background: `linear-gradient(145deg, hsl(${hue} 55% 42%), hsl(${(hue + 50) % 360} 60% 22%))`,
      }}
      aria-hidden
    >
      <span className="poster-initials">{initials}</span>
      {size === 'md' && <span className="poster-title">{name}</span>}
    </div>
  );
}
