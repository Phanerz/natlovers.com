"use client";

export function BackgroundMesh() {
  return (
    <div className="aoh-mesh" aria-hidden="true">
      <div
        className="aoh-blob aoh-blob-1"
        style={{
          top: "-14%",
          left: "-12%",
          width: "52vmax",
          height: "52vmax",
          background: "radial-gradient(circle, rgba(217,167,92,0.42), rgba(217,167,92,0) 70%)"
        }}
      />
      <div
        className="aoh-blob aoh-blob-2"
        style={{
          bottom: "-18%",
          right: "-14%",
          width: "58vmax",
          height: "58vmax",
          background: "radial-gradient(circle, rgba(72,144,196,0.5), rgba(72,144,196,0) 70%)"
        }}
      />
      <div
        className="aoh-blob aoh-blob-3"
        style={{
          top: "28%",
          left: "50%",
          width: "48vmax",
          height: "48vmax",
          background: "radial-gradient(circle, rgba(178,104,148,0.38), rgba(178,104,148,0) 70%)"
        }}
      />
    </div>
  );
}
