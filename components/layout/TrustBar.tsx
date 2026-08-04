export function TrustBar() {
  const items = [
    <>
      <b>Fabriqué en France</b>
    </>,
    <>
      Powered by <b>Somfy</b> · garantie jusqu&apos;à 7 ans
    </>,
    <>
      <b>Franco de port</b> dès 400 € HT
    </>,
  ];
  return (
    <div className="trust">
      <div className="wrap">
        {items.map((node, i) => (
          <span key={i}>
            <span className="dot">●</span> {node}
          </span>
        ))}
      </div>
    </div>
  );
}
